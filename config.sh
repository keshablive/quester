#!/bin/bash

# Quester Configuration & Management Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env exists
check_env() {
    if [ ! -f .env ]; then
        log_warn ".env file not found!"
        log_info "Please create one or run './config.sh setup' to generate it."
        return 1
    fi
    return 0
}

# Commands
cmd_setup() {
    log_info "Setting up Quester environment..."
    
    if [ -f .env ]; then
        log_warn ".env already exists. Skipping generation."
    else
        log_info "Generating .env from defaults..."
        # In a real scenario, we might copy a template or interactively ask.
        # For now, we assume the user might want to copy the example or we just warn.
        log_warn "Please ensure .env is populated correctly."
    fi

    log_info "Building Docker images..."
    docker-compose build
    
    log_info "Setup complete! Run './config.sh up' to start."
}

cmd_up() {
    check_env || exit 1
    log_info "Starting services..."
    docker-compose up -d
    
    log_info "Services started!"
    echo "------------------------------------------------"
    echo -e "Client:        http://localhost:3000"
    echo -e "Server:        http://localhost:8000"
    echo -e "Grafana:       http://localhost:3001"
    echo -e "Redis UI:      http://localhost:8081"
    echo -e "Nginx RTMP:    rtmp://localhost:1935"
    echo "------------------------------------------------"
}

cmd_down() {
    log_info "Stopping services..."
    docker-compose down
}

cmd_logs() {
    docker-compose logs -f
}

cmd_clean() {
    log_warn "This will remove all containers and volumes. Are you sure? [y/N]"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])+$ ]]; then
        docker-compose down -v
        log_info "Cleaned up successfully."
    else
        log_info "Aborted."
    fi
}

cmd_shell_server() {
    docker-compose exec server sh
}

cmd_shell_db() {
    docker-compose exec postgres psql -U quester_user -d quester_db
}

# Main
case "$1" in
    setup)
        cmd_setup
        ;;
    up)
        cmd_up
        ;;
    down)
        cmd_down
        ;;
    logs)
        cmd_logs
        ;;
    clean)
        cmd_clean
        ;;
    shell-server)
        cmd_shell_server
        ;;
    shell-db)
        cmd_shell_db
        ;;
    *)
        echo "Usage: $0 {setup|up|down|logs|clean|shell-server|shell-db}"
        exit 1
        ;;
esac
