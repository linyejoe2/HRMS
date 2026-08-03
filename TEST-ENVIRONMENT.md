# Test Environment Setup

This document describes how to use the test environment for the HRMS application.

## Overview

The test environment runs completely separately from your development/production environment with:
- Different container names (with `-test` suffix)
- Different ports to avoid conflicts
- Separate database and data storage
- Separate network (`hrms-network-test`)

## Port Mapping

### Development Environment
- NGINX: `5200`
- Backend: `5201`
- Frontend: `5202`
- MongoDB: `27019`

### Test Environment
- NGINX: `5300`
- Backend: `5301`
- Frontend: `5302`
- MongoDB: `27020`

## Container Names

### Development Environment
- `HRMS-db`
- `HRMS-backend`
- `HRMS-frontend`
- `HRMS-nginx`

### Test Environment
- `HRMS-db-test`
- `HRMS-backend-test`
- `HRMS-frontend-test`
- `HRMS-nginx-test`

## Data Storage

Test data is stored separately:
- Database: `./database/data/db-test`
- Uploads: `./backend/uploads-test`
- Data: `./data-test`

## Available Scripts

### build-test.bat
Builds and starts the test environment.
```bat
build-test.bat
```

### stop-test.bat
Stops and removes all test containers.
```bat
stop-test.bat
```

### restart-test.bat
Restarts all test containers without rebuilding.
```bat
restart-test.bat
```

### logs-test.bat
Views logs from test containers.
```bat
# View all logs
logs-test.bat all

# View specific service logs
logs-test.bat backend
logs-test.bat frontend
logs-test.bat mongodb
logs-test.bat nginx
```

## Usage

### Starting the Test Environment

1. Make sure the development environment is running or stopped (both can run simultaneously)
2. Run the build script:
   ```bat
   build-test.bat
   ```
3. Access the test application at `http://localhost:5300`

### Stopping the Test Environment

```bat
stop-test.bat
```

### Viewing Logs

```bat
# All services
logs-test.bat all

# Specific service
logs-test.bat backend
```

### Restarting Services

```bat
restart-test.bat
```

## Environment Variables

Test environment variables are defined in `.env.test`:
- `NODE_ENV=test`
- `MONGODB_URI` points to `HRMS_TEST` database
- Different port configurations
- Separate data paths

## Running Both Environments

You can run both development and test environments simultaneously on the same server since they use:
- Different ports
- Different container names
- Different networks
- Different data storage paths

### Development Commands
```bat
build.bat                    # Start development
docker compose down          # Stop development
```

### Test Commands
```bat
build-test.bat              # Start test
stop-test.bat               # Stop test
```

## Notes

- The test environment uses the same MongoDB root credentials as development for simplicity
- Test database name is `HRMS_TEST` vs `HRMS` for development
- Both environments can be running at the same time
- Make sure to use the correct ports when accessing each environment
