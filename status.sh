#!/bin/bash

# Yz Playground Status Script
# This script shows the current status of all services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Yz Playground Status${NC}"
echo "================================"

# Check Docker containers
echo -e "\n${BLUE}🐳 Docker Containers:${NC}"
if docker ps | grep -q yz-sandbox; then
    echo -e "${GREEN}✅ yz-sandbox container is running${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep yz-sandbox
else
    echo -e "${RED}❌ yz-sandbox container is not running${NC}"
fi

# Check ports
echo -e "\n${BLUE}🔌 Port Status:${NC}"

# Port 3000 (Frontend)
if lsof -i :3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Port 3000 (Frontend): IN USE${NC}"
    lsof -i :3000 | tail -n +2 | while read line; do
        echo -e "   $line"
    done
else
    echo -e "${RED}❌ Port 3000 (Frontend): FREE${NC}"
fi

# Port 8080 (Backend)
if lsof -i :8080 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Port 8080 (Backend): IN USE${NC}"
    lsof -i :8080 | tail -n +2 | while read line; do
        echo -e "   $line"
    done
else
    echo -e "${RED}❌ Port 8080 (Backend): FREE${NC}"
fi

# Check service health
echo -e "\n${BLUE}🏥 Service Health:${NC}"

# Backend health check
if curl -s http://localhost:8080/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API: HEALTHY${NC}"
else
    echo -e "${RED}❌ Backend API: UNHEALTHY${NC}"
fi

# Frontend health check
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend: HEALTHY${NC}"
else
    echo -e "${RED}❌ Frontend: UNHEALTHY${NC}"
fi

# Check PID files
echo -e "\n${BLUE}📋 Process Information:${NC}"
if [ -f "logs/pids.env" ]; then
    echo -e "${GREEN}✅ PID file exists${NC}"
    source logs/pids.env
    
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo -e "${GREEN}✅ Frontend process (PID: $FRONTEND_PID) is running${NC}"
    else
        echo -e "${RED}❌ Frontend process is not running${NC}"
    fi
    
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${GREEN}✅ Backend process (PID: $BACKEND_PID) is running${NC}"
    else
        echo -e "${RED}❌ Backend process is not running${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No PID file found${NC}"
fi

# Show log files
echo -e "\n${BLUE}📝 Log Files:${NC}"
if [ -f "logs/frontend.log" ]; then
    echo -e "${GREEN}✅ Frontend log exists${NC}"
    echo -e "   Last 3 lines:"
    tail -n 3 logs/frontend.log | sed 's/^/   /'
else
    echo -e "${RED}❌ Frontend log not found${NC}"
fi

if [ -f "logs/backend.log" ]; then
    echo -e "${GREEN}✅ Backend log exists${NC}"
    echo -e "   Last 3 lines:"
    tail -n 3 logs/backend.log | sed 's/^/   /'
else
    echo -e "${RED}❌ Backend log not found${NC}"
fi

echo ""
echo "================================"
echo -e "${YELLOW}💡 Commands:${NC}"
echo -e "   Start:  ${BLUE}./start.sh${NC}"
echo -e "   Stop:   ${BLUE}./stop.sh${NC}"
echo -e "   Status: ${BLUE}./status.sh${NC}"
echo ""
