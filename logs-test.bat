@echo off
if "%1"=="" (
    echo Usage: logs-test.bat [service]
    echo.
    echo Available services:
    echo   mongodb   - View MongoDB logs
    echo   backend   - View Backend logs
    echo   frontend  - View Frontend logs
    echo   nginx     - View Nginx logs
    echo   all       - View all logs
    echo.
    echo Example: logs-test.bat backend
    exit /b
)

if "%1"=="all" (
    docker compose -f docker-compose-test.yml --env-file .env.test logs -f
) else (
    docker compose -f docker-compose-test.yml --env-file .env.test logs -f %1
)
