package logger

import (
	"log"
	"os"
)

// Logger wraps the standard log package with structured logging
type Logger struct {
	infoLogger  *log.Logger
	errorLogger *log.Logger
	debugLogger *log.Logger
}

// New creates a new logger instance
func New() *Logger {
	return &Logger{
		infoLogger:  log.New(os.Stdout, "INFO: ", log.LstdFlags|log.Lshortfile),
		errorLogger: log.New(os.Stderr, "ERROR: ", log.LstdFlags|log.Lshortfile),
		debugLogger: log.New(os.Stdout, "DEBUG: ", log.LstdFlags|log.Lshortfile),
	}
}

// Info logs an info message
func (l *Logger) Info(msg string, v ...interface{}) {
	l.infoLogger.Printf(msg, v...)
}

// Error logs an error message
func (l *Logger) Error(msg string, v ...interface{}) {
	l.errorLogger.Printf(msg, v...)
}

// Debug logs a debug message
func (l *Logger) Debug(msg string, v ...interface{}) {
	l.debugLogger.Printf(msg, v...)
}

// Fatal logs a fatal error and exits
func (l *Logger) Fatal(msg string, v ...interface{}) {
	l.errorLogger.Fatalf(msg, v...)
}
