package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	// Get port from environment variable or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

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
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "yz-playground-backend",
		})
	})

	// API configuration endpoint
	r.GET("/api/config", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"max_execution_time": 10000,
			"max_memory":         256,
			"max_code_size":      10000,
		})
	})

	// Code execution endpoint (placeholder)
	r.POST("/api/execute", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success":        true,
			"output":         "Code execution endpoint - coming soon!",
			"error":          "",
			"execution_time": 0,
			"memory_used":    0,
		})
	})

	// Start server
	log.Printf("Starting Yz Playground Backend on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
