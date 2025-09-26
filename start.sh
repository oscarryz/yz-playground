#!/bin/bash

# Yz Playground Start Script
# This script starts all services needed for the Yz Playground

set -e

echo "🚀 Starting Yz Playground..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${RED}❌ Port $port is already in use${NC}"
        return 1
    fi
    return 0
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

# Check if ports are available
echo -e "${BLUE}🔍 Checking ports...${NC}"
if ! check_port 3000; then
    echo -e "${RED}Please stop the service using port 3000 and try again${NC}"
    exit 1
fi

if ! check_port 8080; then
    echo -e "${RED}Please stop the service using port 8080 and try again${NC}"
    exit 1
fi

# Build containers if needed
echo -e "${BLUE}🔨 Building containers...${NC}"
export DOCKER_BUILDKIT=0 && export COMPOSE_DOCKER_CLI_BUILD=0 && docker-compose build backend sandbox

# Start Podman sandbox
echo -e "${BLUE}🐳 Starting Podman sandbox...${NC}"
podman run -d --name yz-sandbox --privileged \
  -v $(pwd)/tmp/yz-executions:/tmp/yz-executions \
  localhost/yz-sandbox sleep infinity

# Wait a moment for container to be ready
sleep 3

# Check if sandbox is running
if ! podman ps | grep -q yz-sandbox; then
    echo -e "${RED}❌ Failed to start sandbox container${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Sandbox container is running${NC}"

# Start backend container
echo -e "${BLUE}🔧 Starting backend container...${NC}"
podman run -d --name yz-backend \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --env SANDBOX_CONTAINER=yz-sandbox \
  --env YZ_COMPILER_PATH=/usr/local/bin/yzc \
  docker.io/library/yz-playground-backend:latest

# Check if backend is running
if ! podman ps | grep -q yz-backend; then
    echo -e "${RED}❌ Failed to start backend container${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend container is running${NC}"

# Wait for backend to be ready
if ! wait_for_service "http://localhost:8080/api/health" "Backend API"; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    podman stop yz-backend 2>/dev/null || true
    podman stop yz-sandbox 2>/dev/null || true
    exit 1
fi

# Start frontend server
echo -e "${BLUE}🎨 Starting frontend server...${NC}"
cd frontend

# Start frontend in background
nohup python3 -m http.server 3000 > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid

cd ..

# Wait for frontend to be ready
if ! wait_for_service "http://localhost:3000" "Frontend"; then
    echo -e "${RED}❌ Frontend failed to start${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
    podman stop yz-backend 2>/dev/null || true
    podman stop yz-sandbox 2>/dev/null || true
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Save PIDs for stop script
echo "FRONTEND_PID=$FRONTEND_PID" > logs/pids.env
echo "# Backend and sandbox are running in Podman containers" >> logs/pids.env

echo ""
echo -e "${GREEN}🎉 Yz Playground is now running!${NC}"
echo ""
echo -e "${BLUE}📱 Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}🔧 Backend:${NC} http://localhost:8080"
echo -e "${BLUE}🐳 Sandbox:${NC} yz-sandbox container"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo -e "   Frontend: logs/frontend.log"
echo -e "   Backend:  podman logs yz-backend"
echo ""
echo -e "${YELLOW}🛑 To stop:${NC} ./stop.sh"
echo ""
