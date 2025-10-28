#!/bin/bash
# ============================================
# HRMS Start Script for Linux/Mac (Docker)
# ============================================
# This script builds and starts all HRMS
# services using Docker Compose
# ============================================

set -e  # Exit on error
ERROR_COUNT=0
START_TIME=$(date +%T)

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "============================================"
echo "  HRMS Application Start Script"
echo "============================================"
echo "Start Time: $START_TIME"
echo ""

# Step 1: Check Docker installation
echo -e "${BLUE}[Step 1/8]${NC} Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Docker is not installed or not in PATH"
    echo "Please install Docker from: https://www.docker.com/get-started"
    ((ERROR_COUNT++))
    exit 1
fi
docker --version
echo -e "${GREEN}[OK]${NC} Docker is installed"
echo ""

# Step 2: Check Docker Compose installation
echo -e "${BLUE}[Step 2/8]${NC} Checking Docker Compose installation..."
if ! docker compose version &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Docker Compose is not available"
    echo "Please ensure Docker is properly installed with Compose V2"
    ((ERROR_COUNT++))
    exit 1
fi
docker compose version
echo -e "${GREEN}[OK]${NC} Docker Compose is available"
echo ""

# Step 3: Check Docker daemon
echo -e "${BLUE}[Step 3/8]${NC} Checking Docker daemon status..."
if ! docker ps &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Docker daemon is not running"
    echo "Please start the Docker daemon:"
    echo "  - Linux: sudo systemctl start docker"
    echo "  - Mac: Start Docker Desktop"
    ((ERROR_COUNT++))
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Docker daemon is running"
echo ""

# Step 4: Check .env file
echo -e "${BLUE}[Step 4/8]${NC} Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}[WARNING]${NC} .env file not found"
    echo "Using default configuration from docker-compose.yml"
    echo "For production, please create .env file from .env.example"
else
    echo -e "${GREEN}[OK]${NC} .env file found"
fi
echo ""

# Step 5: Build Docker images
echo -e "${BLUE}[Step 5/8]${NC} Building Docker images..."
echo "This may take several minutes on first build..."
echo ""

echo "Building backend image..."
if ! docker compose build backend; then
    echo -e "${RED}[ERROR]${NC} Backend Docker build failed"
    ((ERROR_COUNT++))
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Backend image built successfully"
echo ""

echo "Building frontend image..."
if ! docker compose build frontend; then
    echo -e "${RED}[ERROR]${NC} Frontend Docker build failed"
    ((ERROR_COUNT++))
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Frontend image built successfully"
echo ""

# Step 6: Stop existing containers (if any)
echo -e "${BLUE}[Step 6/8]${NC} Stopping existing containers..."
docker compose down &> /dev/null || true
echo -e "${GREEN}[OK]${NC} Previous containers stopped (if any)"
echo ""

# Step 7: Start all services
echo -e "${BLUE}[Step 7/8]${NC} Starting all services..."
echo "This may take a moment..."
echo ""

if ! docker compose up -d; then
    echo -e "${RED}[ERROR]${NC} Failed to start services"
    echo "Run 'docker compose logs' for details"
    ((ERROR_COUNT++))
    exit 1
fi
echo -e "${GREEN}[OK]${NC} All services started"
echo ""

# Wait a moment for services to initialize
echo "Waiting for services to initialize..."
sleep 5
echo ""

# Step 8: Health checks
echo -e "${BLUE}[Step 8/8]${NC} Performing health checks..."
echo ""
echo "Checking running containers..."
docker compose ps
echo ""

echo "Checking MongoDB status..."
if docker compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
    echo -e "  ${GREEN}[OK]${NC} MongoDB is responding"
else
    echo -e "  ${YELLOW}[WARNING]${NC} MongoDB connection check failed"
    echo "  It may still be starting up. Check logs if issues persist."
fi

echo "Checking backend health endpoint..."
sleep 3
if curl -s http://localhost:6002/api/health &> /dev/null; then
    echo -e "  ${GREEN}[OK]${NC} Backend API is responding"
else
    echo -e "  ${YELLOW}[WARNING]${NC} Backend health check failed"
    echo "  Service may still be starting. Check logs: docker compose logs backend"
fi

echo "Checking frontend..."
if curl -s http://localhost:80 &> /dev/null; then
    echo -e "  ${GREEN}[OK]${NC} Frontend is responding"
else
    echo -e "  ${YELLOW}[WARNING]${NC} Frontend check failed"
    echo "  Check NGINX_PORT in .env or logs: docker compose logs frontend"
fi
echo ""

# Summary
echo "============================================"
echo "  Startup Summary"
echo "============================================"
END_TIME=$(date +%T)
echo "Start Time: $START_TIME"
echo "End Time:   $END_TIME"
echo ""

if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS]${NC} HRMS application started successfully!"
    echo ""
    echo "Services Running:"
    echo "  - MongoDB:  Running on port 27019"
    echo "  - Backend:  Running on port 6002"
    echo "  - Frontend: Running on port 80 (via Nginx)"
    echo ""
    echo "Access Points:"
    echo "  - Application: http://localhost"
    echo "  - API Health:  http://localhost:6002/api/health"
    echo "  - API Docs:    http://localhost:6002/api"
    echo ""
    echo "Useful Commands:"
    echo "  - View logs:        docker compose logs -f"
    echo "  - View status:      docker compose ps"
    echo "  - Stop services:    docker compose down"
    echo "  - Restart service:  docker compose restart [service]"
    echo "  - Rebuild & restart: ./start.sh (this script)"
    echo ""
    echo "Note: If health checks show warnings, wait a minute for"
    echo "      services to fully initialize, then check again."
    echo ""
else
    echo -e "${RED}[FAILED]${NC} Startup encountered $ERROR_COUNT error(s)"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Ensure Docker daemon is running"
    echo "  2. Check docker-compose.yml syntax"
    echo "  3. Review Dockerfile in backend/ and frontend/"
    echo "  4. Check logs: docker compose logs"
    echo "  5. Verify .env configuration"
    echo "  6. Check port availability (80, 6002, 27019)"
    echo "  7. Check available disk space"
    echo ""
fi

echo "============================================"
exit $ERROR_COUNT
