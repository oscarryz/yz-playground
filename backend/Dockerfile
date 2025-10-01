# Multi-stage build for Yz Playground Backend
FROM golang:1.23-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application with memory optimizations
ENV GOGC=100
ENV GOMAXPROCS=1
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o main ./cmd/server

# Final stage
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache ca-certificates docker-cli

# Set working directory
WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
