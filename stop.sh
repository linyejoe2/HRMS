#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
ENV_FILE="$PROJECT_ROOT/.env"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

fail() {
    echo "[ERROR] $1" >&2
    exit 1
}

[ -f "$COMPOSE_FILE" ] || fail "Missing Docker Compose file: $COMPOSE_FILE"
[ -f "$ENV_FILE" ] || fail "Missing environment file: $ENV_FILE"

compose() {
    docker compose --project-directory "$PROJECT_ROOT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

command -v docker >/dev/null 2>&1 || fail 'Docker is not installed or not in PATH.'
docker compose version >/dev/null 2>&1 || fail 'Docker Compose V2 is not available.'
docker ps >/dev/null 2>&1 || fail 'Docker daemon is not running or the current user cannot access it.'

printf '\nStopping HRMS services...\n'
compose down
printf 'HRMS services stopped. Persistent data was retained.\n'
