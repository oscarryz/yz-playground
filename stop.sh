#!/bin/bash

# Yz Playground Stop Script
# This script stops all services for the Yz Playground

set -e

echo "🛑 Stopping Yz Playground..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to stop service by PID
stop_service() {
    local pid=$1
    local service_name=$2
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo -e "${BLUE}🛑 Stopping $service_name (PID: $pid)...${NC}"
        kill "$pid" 2>/dev/null || true
        
        # Wait for graceful shutdown
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt 5 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Force killing $service_name...${NC}"
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✅ $service_name stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  $service_name was not running${NC}"
    fi
}

# Stop services using PIDs if available
if [ -f "logs/pids.env" ]; then
    echo -e "${BLUE}📋 Reading service PIDs...${NC}"
    source logs/pids.env
    
    if [ -n "$FRONTEND_PID" ]; then
        stop_service "$FRONTEND_PID" "Frontend server"
    fi
    
    # Clean up PID file
    rm -f logs/pids.env
else
    echo -e "${YELLOW}⚠️  No PID file found, stopping by process name...${NC}"
    
    # Stop by process name as fallback
    echo -e "${BLUE}🛑 Stopping frontend server...${NC}"
    pkill -f "python3 -m http.server 3000" 2>/dev/null || true
fi

# Stop Podman containers
echo -e "${BLUE}🐳 Stopping Podman containers...${NC}"
echo -e "${BLUE}🛑 Stopping backend container...${NC}"
podman stop yz-backend 2>/dev/null || true
podman rm yz-backend 2>/dev/null || true

echo -e "${BLUE}🛑 Stopping sandbox container...${NC}"
podman stop yz-sandbox 2>/dev/null || true
podman rm yz-sandbox 2>/dev/null || true

# Stop Docker containers (fallback)
echo -e "${BLUE}🐳 Stopping Docker containers (fallback)...${NC}"
docker-compose down 2>/dev/null || true

# Clean up any remaining processes on our ports
echo -e "${BLUE}🧹 Cleaning up ports...${NC}"

# Kill any remaining processes on port 3000
for pid in $(lsof -t -i:3000 2>/dev/null || true); do
    echo -e "${YELLOW}⚠️  Killing process $pid on port 3000${NC}"
    kill -9 "$pid" 2>/dev/null || true
done

# Kill any remaining processes on port 8080
for pid in $(lsof -t -i:8080 2>/dev/null || true); do
    echo -e "${YELLOW}⚠️  Killing process $pid on port 8080${NC}"
    kill -9 "$pid" 2>/dev/null || true
done

# Verify ports are free
echo -e "${BLUE}🔍 Verifying ports are free...${NC}"
if lsof -i :3000 >/dev/null 2>&1; then
    echo -e "${RED}❌ Port 3000 is still in use${NC}"
else
    echo -e "${GREEN}✅ Port 3000 is free${NC}"
fi

if lsof -i :8080 >/dev/null 2>&1; then
    echo -e "${RED}❌ Port 8080 is still in use${NC}"
else
    echo -e "${GREEN}✅ Port 8080 is free${NC}"
fi

# Clean up log files (optional)
if [ "$1" = "--clean-logs" ]; then
    echo -e "${BLUE}🧹 Cleaning up log files...${NC}"
    rm -f logs/frontend.log logs/backend.log logs/frontend.pid logs/backend.pid
    echo -e "${GREEN}✅ Log files cleaned${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Yz Playground has been stopped!${NC}"
echo ""
echo -e "${YELLOW}💡 To start again:${NC} ./start.sh"
echo -e "${YELLOW}💡 To clean logs:${NC} ./stop.sh --clean-logs"
echo ""
