package sandbox

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/client"
)

// Sandbox represents a Docker-based sandbox for code execution
type Sandbox struct {
	client    *client.Client
	imageName string
	config    *SandboxConfig
}

// SandboxConfig holds sandbox configuration
type SandboxConfig struct {
	ImageName        string
	MaxMemory        int64 // in bytes
	MaxExecutionTime int   // in seconds
	WorkingDir       string
}

// ExecutionResult holds the result of code execution
type ExecutionResult struct {
	Success       bool
	Output        string
	Error         string
	ExecutionTime int
	MemoryUsed    int64
}

// New creates a new sandbox instance
func New(config *SandboxConfig) (*Sandbox, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	return &Sandbox{
		client:    cli,
		imageName: config.ImageName,
		config:    config,
	}, nil
}

// ExecuteCode executes Yz code in the sandbox
func (s *Sandbox) ExecuteCode(ctx context.Context, code string) (*ExecutionResult, error) {
	startTime := time.Now()

	// Create temporary directory for execution
	tempDir, err := s.createTempDir()
	if err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Write code to file
	codeFile := filepath.Join(tempDir, "main.yz")
	if err := os.WriteFile(codeFile, []byte(code), 0644); err != nil {
		return nil, fmt.Errorf("failed to write code file: %w", err)
	}

	// Create container
	containerID, err := s.createContainer(ctx, tempDir)
	if err != nil {
		return nil, fmt.Errorf("failed to create container: %w", err)
	}
	defer s.removeContainer(ctx, containerID)

	// Execute code compilation and run
	output, err := s.executeInContainer(ctx, containerID, tempDir)

	executionTime := int(time.Since(startTime).Milliseconds())

	result := &ExecutionResult{
		Success:       err == nil,
		Output:        output,
		ExecutionTime: executionTime,
	}

	if err != nil {
		result.Error = err.Error()
	}

	return result, nil
}

// createTempDir creates a temporary directory for execution
func (s *Sandbox) createTempDir() (string, error) {
	tempDir, err := os.MkdirTemp("", "yz-execution-*")
	if err != nil {
		return "", err
	}
	return tempDir, nil
}

// createContainer creates a Docker container for execution
func (s *Sandbox) createContainer(ctx context.Context, tempDir string) (string, error) {
	containerConfig := &container.Config{
		Image:      s.imageName,
		Cmd:        []string{"sleep", "infinity"},
		WorkingDir: "/workspace",
		User:       "yzuser",
	}

	hostConfig := &container.HostConfig{
		Privileged: true, // Required for isolate
		Resources: container.Resources{
			Memory:     s.config.MaxMemory,
			MemorySwap: s.config.MaxMemory,
		},
		Mounts: []mount.Mount{
			{
				Type:   mount.TypeBind,
				Source: tempDir,
				Target: "/workspace",
			},
		},
		AutoRemove: false, // We'll remove manually
	}

	resp, err := s.client.ContainerCreate(ctx, containerConfig, hostConfig, nil, nil, "")
	if err != nil {
		return "", err
	}

	// Start container
	if err := s.client.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return "", err
	}

	return resp.ID, nil
}

// executeInContainer executes the Yz code in the container
func (s *Sandbox) executeInContainer(ctx context.Context, containerID, tempDir string) (string, error) {
	// Create execution context with timeout
	execCtx, cancel := context.WithTimeout(ctx, time.Duration(s.config.MaxExecutionTime)*time.Second)
	defer cancel()

	// Compile and run the code
	execConfig := container.ExecOptions{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"bash", "-c", "cd /workspace && yzc build && ./bin/app"},
		User:         "yzuser",
	}

	execResp, err := s.client.ContainerExecCreate(execCtx, containerID, execConfig)
	if err != nil {
		return "", fmt.Errorf("failed to create exec: %w", err)
	}

	// Attach to execution
	attachResp, err := s.client.ContainerExecAttach(execCtx, execResp.ID, container.ExecAttachOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to attach to exec: %w", err)
	}
	defer attachResp.Close()

	// Read output
	output, err := io.ReadAll(attachResp.Reader)
	if err != nil {
		return "", fmt.Errorf("failed to read output: %w", err)
	}

	// Check execution result
	inspectResp, err := s.client.ContainerExecInspect(execCtx, execResp.ID)
	if err != nil {
		return "", fmt.Errorf("failed to inspect exec: %w", err)
	}

	if inspectResp.ExitCode != 0 {
		return "", fmt.Errorf("execution failed with exit code %d: %s", inspectResp.ExitCode, string(output))
	}

	return strings.TrimSpace(string(output)), nil
}

// removeContainer removes the Docker container
func (s *Sandbox) removeContainer(ctx context.Context, containerID string) {
	options := container.RemoveOptions{
		Force: true,
	}

	if err := s.client.ContainerRemove(ctx, containerID, options); err != nil {
		fmt.Printf("Warning: failed to remove container %s: %v\n", containerID, err)
	}
}

// Close closes the sandbox client
func (s *Sandbox) Close() error {
	return s.client.Close()
}
