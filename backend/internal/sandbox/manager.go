package sandbox

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Manager manages multiple sandbox instances
type Manager struct {
	sandboxes map[string]*Sandbox
	mutex     sync.RWMutex
	config    *SandboxConfig
}

// NewManager creates a new sandbox manager
func NewManager(config *SandboxConfig) *Manager {
	return &Manager{
		sandboxes: make(map[string]*Sandbox),
		config:    config,
	}
}

// GetSandbox gets or creates a sandbox instance
func (m *Manager) GetSandbox(id string) (*Sandbox, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if sandbox, exists := m.sandboxes[id]; exists {
		return sandbox, nil
	}

	sandbox, err := New(m.config)
	if err != nil {
		return nil, fmt.Errorf("failed to create sandbox: %w", err)
	}

	m.sandboxes[id] = sandbox
	return sandbox, nil
}

// RemoveSandbox removes a sandbox instance
func (m *Manager) RemoveSandbox(id string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if sandbox, exists := m.sandboxes[id]; exists {
		if err := sandbox.Close(); err != nil {
			return fmt.Errorf("failed to close sandbox: %w", err)
		}
		delete(m.sandboxes, id)
	}

	return nil
}

// Cleanup removes all sandbox instances
func (m *Manager) Cleanup() error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	var lastErr error
	for id, sandbox := range m.sandboxes {
		if err := sandbox.Close(); err != nil {
			lastErr = fmt.Errorf("failed to close sandbox %s: %w", id, err)
		}
	}

	m.sandboxes = make(map[string]*Sandbox)
	return lastErr
}

// GetStats returns statistics about active sandboxes
func (m *Manager) GetStats() map[string]interface{} {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	return map[string]interface{}{
		"active_sandboxes":   len(m.sandboxes),
		"max_memory":         m.config.MaxMemory,
		"max_execution_time": m.config.MaxExecutionTime,
	}
}

// ExecuteWithTimeout executes code with a timeout
func (m *Manager) ExecuteWithTimeout(ctx context.Context, code string, timeout time.Duration) (*ExecutionResult, error) {
	// Create context with timeout
	timeoutCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// Use existing sandbox instance for execution
	sandbox, err := m.GetSandbox("default")
	if err != nil {
		return nil, fmt.Errorf("failed to get sandbox: %w", err)
	}

	// Execute code
	result, err := sandbox.ExecuteCode(timeoutCtx, code)
	if err != nil {
		return nil, fmt.Errorf("execution failed: %w", err)
	}

	return result, nil
}
