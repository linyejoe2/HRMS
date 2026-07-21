#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$SCRIPT_DIR"
ENV_FILE="$PROJECT_ROOT/.env"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
START_TIME=$(date +%T)

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

compose() {
    docker compose --project-directory "$PROJECT_ROOT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

fail() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

port_url() {
    local service="$1"
    local container_port="$2"
    local mapping
    mapping=$(compose port "$service" "$container_port") || return 1
    printf 'http://localhost:%s' "${mapping##*:}"
}

wait_for() {
    local name="$1"
    shift
    local deadline=$((SECONDS + 90))

    while [ "$SECONDS" -lt "$deadline" ]; do
        if "$@" >/dev/null 2>&1; then
            echo -e "  ${GREEN}[OK]${NC} $name"
            return 0
        fi
        sleep 2
    done

    echo -e "  ${RED}[FAILED]${NC} $name" >&2
    return 1
}

cd -- "$PROJECT_ROOT"

echo
echo '============================================'
echo '  HRMS Application Start Script'
echo '============================================'
echo "Start Time: $START_TIME"
echo

echo -e "${BLUE}[Step 1/9]${NC} Preparing release files..."
[ -x "$PROJECT_ROOT/download_and_extract.sh" ] || fail "Release installer is not executable: $PROJECT_ROOT/download_and_extract.sh"
"$PROJECT_ROOT/download_and_extract.sh" --target-dir "$PROJECT_ROOT" --preserve-launcher || fail 'Release download or extraction failed; existing containers were not changed.'
echo -e "${GREEN}[OK]${NC} Release files are ready"
echo

echo -e "${BLUE}[Step 2/9]${NC} Preparing environment configuration..."
if [ ! -f "$ENV_FILE" ]; then
    [ -f "$PROJECT_ROOT/.env.example" ] || fail "Missing environment template: $PROJECT_ROOT/.env.example"
    cp "$PROJECT_ROOT/.env.example" "$ENV_FILE"
    echo 'Created .env from .env.example'
fi
if ! grep -Eq '^[[:space:]]*DATA=' "$ENV_FILE"; then
    printf '\nDATA=./data\n' >> "$ENV_FILE"
    echo 'Added DATA=./data to .env'
fi
mkdir -p "$PROJECT_ROOT/data"
echo -e "${GREEN}[OK]${NC} Environment configuration is ready"
echo

echo -e "${BLUE}[Step 3/9]${NC} Checking Docker installation..."
command -v docker >/dev/null 2>&1 || fail 'Docker is not installed or not in PATH.'
docker --version
echo -e "${GREEN}[OK]${NC} Docker is installed"
echo

echo -e "${BLUE}[Step 4/9]${NC} Checking Docker Compose..."
docker compose version >/dev/null 2>&1 || fail 'Docker Compose V2 is not available.'
docker compose version
echo -e "${GREEN}[OK]${NC} Docker Compose is available"
echo

echo -e "${BLUE}[Step 5/9]${NC} Checking Docker daemon..."
docker ps >/dev/null 2>&1 || fail 'Docker daemon is not running or the current user cannot access it.'
echo -e "${GREEN}[OK]${NC} Docker daemon is running"
echo

echo -e "${BLUE}[Step 6/9]${NC} Validating Docker Compose configuration..."
compose config -q || fail 'Docker Compose configuration is invalid.'
echo -e "${GREEN}[OK]${NC} Docker Compose configuration is valid"
echo

echo -e "${BLUE}[Step 7/9]${NC} Building Docker images..."
compose build backend frontend || fail 'Docker image build failed.'
echo -e "${GREEN}[OK]${NC} Docker images built successfully"
echo

echo -e "${BLUE}[Step 8/9]${NC} Starting all services..."
compose down || fail 'Failed to stop existing containers.'
compose up -d || fail 'Failed to start services. Run docker compose logs from the project directory for details.'
echo -e "${GREEN}[OK]${NC} All services started"
echo

echo -e "${BLUE}[Step 9/9]${NC} Performing health checks..."
command -v curl >/dev/null 2>&1 || fail 'curl is required for health checks.'
backend_url=$(port_url backend 3000) || fail 'Unable to determine the backend port mapping.'
nginx_url=$(port_url nginx 80) || fail 'Unable to determine the Nginx port mapping.'

echo 'Checking running containers...'
compose ps
echo

health_failed=0
wait_for 'MongoDB is responding' compose exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" || health_failed=1
wait_for 'Backend API is responding' curl --fail --silent --show-error "$backend_url/api/health" || health_failed=1
wait_for 'Nginx proxy API is responding' curl --fail --silent --show-error "$nginx_url/api/health" || health_failed=1
wait_for 'Frontend is responding' curl --fail --silent --show-error "$nginx_url/" || health_failed=1
wait_for 'Release archive is available' curl --fail --silent --show-error "$nginx_url/public/release.zip" || health_failed=1

if [ "$health_failed" -ne 0 ]; then
    echo
    echo -e "${RED}[FAILED]${NC} One or more health checks did not complete within 90 seconds."
    echo "Inspect logs with: docker compose --project-directory $PROJECT_ROOT --env-file $ENV_FILE -f $COMPOSE_FILE logs --tail=200"
    exit 1
fi

echo
echo '============================================'
echo -e "${GREEN}[SUCCESS]${NC} HRMS application started successfully!"
echo "Application: $nginx_url"
echo "API Health:  $nginx_url/api/health"
echo "Direct API:  $backend_url/api/health"
echo "Release:     $nginx_url/public/release.zip"
echo '============================================'
