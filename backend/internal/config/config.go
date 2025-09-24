package config

import (
	"os"
	"strconv"
)

// Config holds the application configuration
type Config struct {
	Port             string
	MaxExecutionTime int
	MaxMemory        int
	MaxCodeSize      int
	SandboxContainer string
	YZCompilerPath   string
	IsolateConfig    string
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		Port:             getEnv("PORT", "8080"),
		MaxExecutionTime: getEnvAsInt("MAX_EXECUTION_TIME", 10000),
		MaxMemory:        getEnvAsInt("MAX_MEMORY", 256),
		MaxCodeSize:      getEnvAsInt("MAX_CODE_SIZE", 10000),
		SandboxContainer: getEnv("SANDBOX_CONTAINER", "yz-sandbox"),
		YZCompilerPath:   getEnv("YZ_COMPILER_PATH", "/usr/local/bin/yzc"),
		IsolateConfig:    getEnv("ISOLATE_CONFIG", "/etc/isolate.conf"),
	}
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt gets an environment variable as integer or returns a default value
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
