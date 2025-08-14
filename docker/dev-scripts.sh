#!/bin/bash

# CBT Application Docker Development Scripts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_status ".env file created. Please review and update the values."
        else
            print_error ".env.example file not found. Please create .env file manually."
            exit 1
        fi
    fi
}

# Build all services
build_all() {
    print_header "Building all Docker services"
    docker-compose build --parallel
    print_status "All services built successfully"
}

# Start development environment
start_dev() {
    print_header "Starting development environment"
    check_env_file
    docker-compose up -d
    print_status "Development environment started"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend API: http://localhost:4000"
    print_status "Local Server: http://localhost:5000"
}

# Start development environment with logs
start_dev_logs() {
    print_header "Starting development environment with logs"
    check_env_file
    docker-compose up
}

# Stop development environment
stop_dev() {
    print_header "Stopping development environment"
    docker-compose down
    print_status "Development environment stopped"
}

# Restart specific service
restart_service() {
    if [ -z "$1" ]; then
        print_error "Please specify a service name"
        print_status "Available services: frontend, backend, local-server, mongo, redis, local-mongo, local-redis, nginx"
        exit 1
    fi
    
    print_header "Restarting service: $1"
    docker-compose restart "$1"
    print_status "Service $1 restarted"
}

# View logs for specific service
logs_service() {
    if [ -z "$1" ]; then
        print_error "Please specify a service name"
        exit 1
    fi
    
    print_header "Viewing logs for service: $1"
    docker-compose logs -f "$1"
}

# Clean up everything
cleanup() {
    print_header "Cleaning up Docker resources"
    docker-compose down -v --remove-orphans
    docker system prune -f
    print_status "Cleanup completed"
}

# Reset databases
reset_db() {
    print_header "Resetting databases"
    docker-compose stop mongo local-mongo redis local-redis
    docker-compose rm -f mongo local-mongo redis local-redis
    docker volume rm $(docker volume ls -q | grep -E "(mongo|redis)") 2>/dev/null || true
    docker-compose up -d mongo local-mongo redis local-redis
    print_status "Databases reset"
}

# Show service status
status() {
    print_header "Service Status"
    docker-compose ps
}

# Show help
show_help() {
    print_header "CBT Application Docker Development Scripts"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build           Build all Docker services"
    echo "  start           Start development environment (detached)"
    echo "  start-logs      Start development environment with logs"
    echo "  stop            Stop development environment"
    echo "  restart <svc>   Restart specific service"
    echo "  logs <svc>      View logs for specific service"
    echo "  status          Show service status"
    echo "  reset-db        Reset all databases"
    echo "  cleanup         Clean up all Docker resources"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 restart frontend"
    echo "  $0 logs backend"
    echo ""
}

# Main script logic
case "$1" in
    build)
        build_all
        ;;
    start)
        start_dev
        ;;
    start-logs)
        start_dev_logs
        ;;
    stop)
        stop_dev
        ;;
    restart)
        restart_service "$2"
        ;;
    logs)
        logs_service "$2"
        ;;
    status)
        status
        ;;
    reset-db)
        reset_db
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac