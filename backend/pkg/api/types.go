package api

// ExecuteRequest represents a code execution request
type ExecuteRequest struct {
	Code              string `json:"code" binding:"required"`
	Timeout           int    `json:"timeout,omitempty"`
	Memory            int    `json:"memory,omitempty"`
	ShowGeneratedCode bool   `json:"show_generated_code,omitempty"`
}

// ExecuteResponse represents a code execution response
type ExecuteResponse struct {
	Success       bool   `json:"success"`
	Output        string `json:"output"`
	GeneratedCode string `json:"generated_code,omitempty"`
	Error         string `json:"error"`
	ExecutionTime int    `json:"execution_time"`
	MemoryUsed    int    `json:"memory_used"`
}

// ConfigResponse represents the API configuration response
type ConfigResponse struct {
	MaxExecutionTime int `json:"max_execution_time"`
	MaxMemory        int `json:"max_memory"`
	MaxCodeSize      int `json:"max_code_size"`
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
}
