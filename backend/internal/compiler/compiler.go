package compiler

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// Compiler represents the Yz compiler wrapper
type Compiler struct {
	executablePath string
	workingDir     string
	timeout        time.Duration
}

// CompileResult holds the result of compilation
type CompileResult struct {
	Success     bool
	Output      string
	Error       string
	Executable  string
	CompileTime int
}

// New creates a new compiler instance
func New(executablePath, workingDir string, timeout time.Duration) *Compiler {
	return &Compiler{
		executablePath: executablePath,
		workingDir:     workingDir,
		timeout:        timeout,
	}
}

// Compile compiles Yz code and returns the result
func (c *Compiler) Compile(ctx context.Context, code string) (*CompileResult, error) {
	startTime := time.Now()

	// Create temporary file for the Yz code
	tempFile, err := c.createTempFile(code)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile)

	// Compile the code
	executablePath := filepath.Join(filepath.Dir(tempFile), "app")
	output, err := c.runCompilation(ctx, tempFile, executablePath)

	compileTime := int(time.Since(startTime).Milliseconds())

	result := &CompileResult{
		Success:     err == nil,
		Output:      output,
		CompileTime: compileTime,
		Executable:  executablePath,
	}

	if err != nil {
		result.Error = err.Error()
	}

	return result, nil
}

// createTempFile creates a temporary Yz file with the given code
func (c *Compiler) createTempFile(code string) (string, error) {
	// Create temp directory if it doesn't exist
	if err := os.MkdirAll(c.workingDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create working directory: %w", err)
	}

	// Create temporary file
	tempFile := filepath.Join(c.workingDir, "main.yz")
	if err := os.WriteFile(tempFile, []byte(code), 0644); err != nil {
		return "", fmt.Errorf("failed to write temp file: %w", err)
	}

	return tempFile, nil
}

// runCompilation runs the Yz compiler on the source file
func (c *Compiler) runCompilation(ctx context.Context, sourceFile, outputPath string) (string, error) {
	// Create context with timeout
	compileCtx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	// Run yzc build command
	cmd := exec.CommandContext(compileCtx, c.executablePath, "build")
	cmd.Dir = filepath.Dir(sourceFile)

	// Capture output
	output, err := cmd.CombinedOutput()
	if err != nil {
		return string(output), fmt.Errorf("compilation failed: %w", err)
	}

	return strings.TrimSpace(string(output)), nil
}

// GetVersion returns the Yz compiler version
func (c *Compiler) GetVersion(ctx context.Context) (string, error) {
	cmd := exec.CommandContext(ctx, c.executablePath, "--version")
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get version: %w", err)
	}
	return strings.TrimSpace(string(output)), nil
}

// ValidateCompiler checks if the compiler is available and working
func (c *Compiler) ValidateCompiler(ctx context.Context) error {
	// Check if executable exists
	if _, err := os.Stat(c.executablePath); os.IsNotExist(err) {
		return fmt.Errorf("compiler executable not found at %s", c.executablePath)
	}

	// Try to get version to verify it works
	_, err := c.GetVersion(ctx)
	if err != nil {
		return fmt.Errorf("compiler validation failed: %w", err)
	}

	return nil
}

// ParseCompileError parses compiler error output for better user experience
func ParseCompileError(errorOutput string) map[string]interface{} {
	lines := strings.Split(strings.TrimSpace(errorOutput), "\n")

	result := map[string]interface{}{
		"raw_error": errorOutput,
		"lines":     lines,
	}

	// Try to extract line number and column if available
	for _, line := range lines {
		if strings.Contains(line, ":") && (strings.Contains(line, "error") || strings.Contains(line, "Error")) {
			// Extract position information
			parts := strings.Split(line, ":")
			if len(parts) >= 3 {
				result["file"] = strings.TrimSpace(parts[0])
				result["line"] = strings.TrimSpace(parts[1])
				result["message"] = strings.TrimSpace(strings.Join(parts[2:], ":"))
			}
			break
		}
	}

	return result
}

// CompilerConfig holds compiler configuration
type CompilerConfig struct {
	ExecutablePath string
	WorkingDir     string
	Timeout        time.Duration
	MaxCodeSize    int
}

// DefaultCompilerConfig returns default compiler configuration
func DefaultCompilerConfig() *CompilerConfig {
	return &CompilerConfig{
		ExecutablePath: "/usr/local/bin/yzc",
		WorkingDir:     "/tmp/yz-compile",
		Timeout:        30 * time.Second,
		MaxCodeSize:    10000,
	}
}
