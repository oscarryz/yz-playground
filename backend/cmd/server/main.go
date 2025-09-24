package main

import (
	"log"
	"net/http"
	"time"

	"yz-playground/internal/config"
	"yz-playground/internal/sandbox"
	"yz-playground/pkg/api"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize sandbox manager
	sandboxConfig := &sandbox.SandboxConfig{
		ImageName:        "yz-sandbox",
		MaxMemory:        int64(cfg.MaxMemory) * 1024 * 1024, // Convert MB to bytes
		MaxExecutionTime: cfg.MaxExecutionTime / 1000,        // Convert ms to seconds
		WorkingDir:       "/workspace",
	}
	sandboxManager := sandbox.NewManager(sandboxConfig)
	defer sandboxManager.Cleanup()

	// Initialize Gin router
	r := gin.Default()

	// Add CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check endpoint
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, api.HealthResponse{
			Status:  "healthy",
			Service: "yz-playground-backend",
		})
	})

	// API configuration endpoint
	r.GET("/api/config", func(c *gin.Context) {
		c.JSON(http.StatusOK, api.ConfigResponse{
			MaxExecutionTime: cfg.MaxExecutionTime,
			MaxMemory:        cfg.MaxMemory,
			MaxCodeSize:      cfg.MaxCodeSize,
		})
	})

	// Code execution endpoint
	r.POST("/api/execute", func(c *gin.Context) {
		var req api.ExecuteRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Validate code size
		if len(req.Code) > cfg.MaxCodeSize {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Code size exceeds maximum limit"})
			return
		}

		// Execute code in sandbox
		timeout := time.Duration(cfg.MaxExecutionTime) * time.Millisecond
		result, err := sandboxManager.ExecuteWithTimeout(c.Request.Context(), req.Code, timeout)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, api.ExecuteResponse{
			Success:       result.Success,
			Output:        result.Output,
			Error:         result.Error,
			ExecutionTime: result.ExecutionTime,
			MemoryUsed:    int(result.MemoryUsed / 1024 / 1024), // Convert bytes to MB
		})
	})

	// Start server
	log.Printf("Starting Yz Playground Backend on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
