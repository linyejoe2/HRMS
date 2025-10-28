@echo off
REM ============================================
REM HRMS Start Script for Windows (Docker)
REM ============================================
REM This script builds and starts all HRMS
REM services using Docker Compose
REM ============================================

setlocal enabledelayedexpansion
set ERROR_COUNT=0
set START_TIME=%TIME%

echo.
echo ============================================
echo  HRMS Application Start Script
echo ============================================
echo Start Time: %START_TIME%
echo.

REM Step 1: Check Docker installation
echo [Step 1/8] Checking Docker installation...
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not installed or not running
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    set /a ERROR_COUNT+=1
    goto :end
)
docker --version
echo [OK] Docker is installed
echo.

REM Step 2: Check Docker Compose
echo [Step 2/8] Checking Docker Compose installation...
docker compose version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker Compose is not available
    echo Please ensure Docker Desktop is running
    set /a ERROR_COUNT+=1
    goto :end
)
docker compose version
echo [OK] Docker Compose is available
echo.

REM Step 3: Check Docker daemon
echo [Step 3/8] Checking Docker daemon status...
docker ps >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker daemon is not running
    echo Please start Docker Desktop
    set /a ERROR_COUNT+=1
    goto :end
)
echo [OK] Docker daemon is running
echo.

REM Step 4: Check .env file
echo [Step 4/8] Checking environment configuration...
if not exist ".env" (
    echo [WARNING] .env file not found
    echo Using default configuration from docker-compose.yml
    echo For production, please create .env file from .env.example
) else (
    echo [OK] .env file found
)
echo.

REM Step 5: Build Docker images
echo [Step 5/8] Building Docker images...
echo This may take several minutes on first build...
echo.

echo Building backend image...
docker compose build backend
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend Docker build failed
    set /a ERROR_COUNT+=1
    goto :end
)
echo [OK] Backend image built successfully
echo.

echo Building frontend image...
docker compose build frontend
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend Docker build failed
    set /a ERROR_COUNT+=1
    goto :end
)
echo [OK] Frontend image built successfully
echo.

REM Step 6: Stop existing containers (if any)
echo [Step 6/8] Stopping existing containers...
docker compose down >nul 2>&1
echo [OK] Previous containers stopped (if any)
echo.

REM Step 7: Start all services
echo [Step 7/8] Starting all services...
echo This may take a moment...
echo.

docker compose up -d
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start services
    echo Run 'docker compose logs' for details
    set /a ERROR_COUNT+=1
    goto :end
)
echo [OK] All services started
echo.

REM Wait a moment for services to initialize
echo Waiting for services to initialize...
timeout /t 5 /nobreak >nul
echo.

REM Step 8: Health checks
echo [Step 8/8] Performing health checks...
echo.
echo Checking running containers...
docker compose ps
echo.

echo Checking MongoDB status...
docker compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   [OK] MongoDB is responding
) else (
    echo   [WARNING] MongoDB connection check failed
    echo   It may still be starting up. Check logs if issues persist.
)

echo Checking backend health endpoint...
timeout /t 3 /nobreak >nul
curl -s http://localhost:6002/api/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   [OK] Backend API is responding
) else (
    echo   [WARNING] Backend health check failed
    echo   Service may still be starting. Check logs: docker compose logs backend
)

echo Checking frontend...
curl -s http://localhost:80 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   [OK] Frontend is responding
) else (
    echo   [WARNING] Frontend check failed
    echo   Check NGINX_PORT in .env or logs: docker compose logs frontend
)
echo.

REM Summary
echo ============================================
echo  Startup Summary
echo ============================================
echo Start Time: %START_TIME%
echo End Time:   %TIME%
echo.

if %ERROR_COUNT% equ 0 (
    echo [SUCCESS] HRMS application started successfully!
    echo.
    echo Services Running:
    echo   - MongoDB:  Running on port 27019
    echo   - Backend:  Running on port 6002
    echo   - Frontend: Running on port 80 (via Nginx)
    echo.
    echo Access Points:
    echo   - Application: http://localhost
    echo   - API Health:  http://localhost:6002/api/health
    echo   - API Docs:    http://localhost:6002/api
    echo.
    echo Useful Commands:
    echo   - View logs:        docker compose logs -f
    echo   - View status:      docker compose ps
    echo   - Stop services:    docker compose down
    echo   - Restart service:  docker compose restart [service]
    echo   - Rebuild ^& restart: start.bat (this script)
    echo.
    echo Note: If health checks show warnings, wait a minute for
    echo       services to fully initialize, then check again.
    echo.
) else (
    echo [FAILED] Startup encountered %ERROR_COUNT% error(s)
    echo.
    echo Troubleshooting:
    echo   1. Ensure Docker Desktop is running
    echo   2. Check docker-compose.yml syntax
    echo   3. Review Dockerfile in backend/ and frontend/
    echo   4. Check logs: docker compose logs
    echo   5. Verify .env configuration
    echo   6. Check port availability (80, 6002, 27019)
    echo   7. Check available disk space
    echo.
)

:end
echo ============================================
exit /b %ERROR_COUNT%
