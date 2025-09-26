# Dockerfile for Yz Playground Backend
FROM golang:1.23-alpine

# Install build dependencies and Docker CLI
RUN apk add --no-cache git ca-certificates docker-cli

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
