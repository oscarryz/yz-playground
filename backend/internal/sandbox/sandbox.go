package sandbox

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"yz-playground/internal/compiler"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/client"
)

// Sandbox represents a Docker-based sandbox for code execution
type Sandbox struct {
	client    *client.Client
	imageName string
	config    *SandboxConfig
	compiler  *compiler.Compiler
}

// SandboxConfig holds sandbox configuration
type SandboxConfig struct {
	ImageName        string
	MaxMemory        int64 // in bytes
	MaxExecutionTime int   // in seconds
	WorkingDir       string
	CompilerPath     string
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

	// Initialize compiler
	compilerInstance := compiler.New(
		config.CompilerPath,
		config.WorkingDir,
		time.Duration(config.MaxExecutionTime)*time.Second,
	)

	return &Sandbox{
		client:    cli,
		imageName: config.ImageName,
		config:    config,
		compiler:  compilerInstance,
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

	// Copy code to existing container's workspace
	err = s.copyCodeToContainer(ctx, tempDir)
	if err != nil {
		return nil, fmt.Errorf("failed to copy code to container: %w", err)
	}

	// Execute code compilation and run using existing container
	output, err := s.executeInContainer(ctx, "yz-sandbox", tempDir)

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

// GetCompilerVersion returns the Yz compiler version
func (s *Sandbox) GetCompilerVersion(ctx context.Context) (string, error) {
	return s.compiler.GetVersion(ctx)
}

// ValidateCompiler validates that the compiler is working
func (s *Sandbox) ValidateCompiler(ctx context.Context) error {
	return s.compiler.ValidateCompiler(ctx)
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

// copyCodeToContainer copies the code file to the container's workspace
func (s *Sandbox) copyCodeToContainer(ctx context.Context, tempDir string) error {
	codeFile := filepath.Join(tempDir, "main.yz")

	// Use docker cp to copy the file to the container
	cmd := exec.CommandContext(ctx, "docker", "cp", codeFile, "yz-sandbox:/workspace/main.yz")

	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("failed to copy code to container: %w", err)
	}

	return nil
}

// executeInContainer executes the Yz code in the container using Podman
func (s *Sandbox) executeInContainer(ctx context.Context, containerID, tempDir string) (string, error) {
	// Create execution context with timeout
	execCtx, cancel := context.WithTimeout(ctx, time.Duration(s.config.MaxExecutionTime)*time.Second)
	defer cancel()

	// Use docker exec command directly for cleaner output
	cmd := exec.CommandContext(execCtx, "docker", "exec", "-u", "yzuser", containerID,
		"bash", "-c", "cd /workspace && yzc main.yz")

	output, err := cmd.Output()
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			return "", fmt.Errorf("execution failed with exit code %d: %s", exitError.ExitCode(), string(exitError.Stderr))
		}
		return "", fmt.Errorf("failed to execute command: %w", err)
	}

	// With docker, output should be clean, but let's still filter any remaining issues
	cleanOutput := filterCompilerOutput(string(output))
	return strings.TrimSpace(cleanOutput), nil
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

// filterCompilerOutput cleans up any remaining binary data from Docker exec
func filterCompilerOutput(output string) string {
	// Remove all binary data patterns aggressively
	cleanOutput := strings.ReplaceAll(output, "\x01\x00\x00\x00\x00\x00\x00", "")
	cleanOutput = strings.ReplaceAll(cleanOutput, "\x01\x00\x00\x00\x00\x00\x00", "")
	cleanOutput = strings.ReplaceAll(cleanOutput, "\x1a", "")
	cleanOutput = strings.ReplaceAll(cleanOutput, "\x00", "")

	// Remove any remaining compiler messages that might slip through
	lines := strings.Split(cleanOutput, "\n")
	var programOutput []string

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		// Skip empty lines
		if trimmedLine == "" {
			continue
		}

		// Skip any remaining compiler build messages
		if strings.Contains(trimmedLine, "Built:") ||
			strings.Contains(trimmedLine, "yzc build") ||
			strings.Contains(trimmedLine, "running generated app") ||
			strings.Contains(trimmedLine, "Execution completed") {
			continue
		}

		// Skip lines with only binary data or control characters
		if len(trimmedLine) < 2 || strings.ContainsAny(trimmedLine, "\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f") {
			continue
		}

		// Keep everything else as program output
		programOutput = append(programOutput, line)
	}

	result := strings.Join(programOutput, "\n")

	// If no program output found, return a helpful message
	if strings.TrimSpace(result) == "" {
		return "Program executed successfully (no output)"
	}

	return result
}
