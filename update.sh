#!/bin/bash

# Yz Compiler Update Script
# This script updates the Yz compiler to the latest version

set -e

echo "🔄 Updating Yz compiler to latest version..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $service_name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name failed to start after $max_attempts seconds${NC}"
    return 1
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
    exit 1
fi

if ! command_exists curl; then
    echo -e "${RED}❌ curl is not installed or not in PATH${NC}"
    exit 1
fi

if [ ! -f "docker/sandbox/Dockerfile" ]; then
    echo -e "${RED}❌ Docker sandbox Dockerfile not found${NC}"
    echo -e "${RED}   Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Stop current services
echo -e "${BLUE}🛑 Stopping current services...${NC}"
if [ -f "stop.sh" ]; then
    ./stop.sh
else
    echo -e "${YELLOW}⚠️  stop.sh not found, manually stopping services...${NC}"
    # Try to stop containers manually
    docker stop yz-backend yz-sandbox 2>/dev/null || true
    docker rm yz-backend yz-sandbox 2>/dev/null || true
    podman stop yz-backend yz-sandbox 2>/dev/null || true
    podman rm yz-backend yz-sandbox 2>/dev/null || true
fi

# Clean up old images to force rebuild
echo -e "${BLUE}🧹 Cleaning up old images...${NC}"
docker rmi localhost/yz-sandbox 2>/dev/null || true
docker rmi yz-sandbox 2>/dev/null || true

# Rebuild sandbox image with latest compiler
echo -e "${BLUE}🔨 Rebuilding sandbox image with latest Yz compiler...${NC}"
echo -e "${YELLOW}   This may take a few minutes as it downloads and builds the latest compiler...${NC}"

if docker build -t yz-sandbox ./docker/sandbox; then
    echo -e "${GREEN}✅ Sandbox image rebuilt successfully${NC}"
else
    echo -e "${RED}❌ Failed to rebuild sandbox image${NC}"
    exit 1
fi

# Rebuild backend image if needed
echo -e "${BLUE}🔨 Rebuilding backend image...${NC}"
if [ -f "backend/Dockerfile" ]; then
    if docker build -t yz-backend ./backend; then
        echo -e "${GREEN}✅ Backend image rebuilt successfully${NC}"
    else
        echo -e "${RED}❌ Failed to rebuild backend image${NC}"
        exit 1
    fi
fi

# Start services
echo -e "${BLUE}🚀 Starting services...${NC}"
if [ -f "start.sh" ]; then
    ./start.sh
else
    echo -e "${YELLOW}⚠️  start.sh not found, starting services manually...${NC}"
    # Start services using docker-compose if available
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d
    else
        echo -e "${RED}❌ No start script or docker-compose.yml found${NC}"
        exit 1
    fi
fi

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Verify compiler version
echo -e "${BLUE}🔍 Verifying compiler version...${NC}"
if wait_for_service "http://localhost:8080/api/health" "Backend API"; then
    echo -e "${BLUE}📋 Current compiler version:${NC}"
    if curl -s http://localhost:8080/api/compiler/version | jq .; then
        echo -e "${GREEN}✅ Compiler version retrieved successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not retrieve compiler version, but service is running${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Backend service not responding, but containers may still be starting${NC}"
    echo -e "${YELLOW}   You can check the compiler version later with:${NC}"
    echo -e "${YELLOW}   curl -s http://localhost:8080/api/compiler/version | jq .${NC}"
fi

# Show status
echo ""
echo -e "${GREEN}🎉 Yz compiler update completed!${NC}"
echo ""
echo -e "${BLUE}📱 Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}🔧 Backend:${NC} http://localhost:8080"
echo -e "${BLUE}🐳 Sandbox:${NC} yz-sandbox container"
echo ""
echo -e "${YELLOW}💡 To check compiler version:${NC}"
echo -e "   curl -s http://localhost:8080/api/compiler/version | jq ."
echo ""
echo -e "${YELLOW}💡 To stop services:${NC} ./stop.sh"
echo ""

# Optional: Show container status
echo -e "${BLUE}📊 Container Status:${NC}"
if command_exists docker; then
    docker ps --filter "name=yz-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
elif command_exists podman; then
    podman ps --filter "name=yz-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
fi
