#!/bin/bash

# CBT App Development Startup Script
# This script helps start the development environment

set -e

echo "🚀 Starting CBT App Development Environment..."

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $1 is already in use"
        return 1
    fi
    return 0
}

# Check required ports
echo "📋 Checking required ports..."
check_port 3000 || echo "   Frontend port (3000) in use"
check_port 4000 || echo "   Backend port (4000) in use"
check_port 5000 || echo "   Local server port (5000) in use"
check_port 27017 || echo "   MongoDB port (27017) in use"
check_port 27018 || echo "   Local MongoDB port (27018) in use"
check_port 6379 || echo "   Redis port (6379) in use"
check_port 6380 || echo "   Local Redis port (6380) in use"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p media local-media local-data

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# MongoDB Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password123

# Redis Configuration
REDIS_PASSWORD=redis123

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Payment Configuration (Optional for development)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
EOF
    echo "✅ Created .env file with default values"
fi

# Start core services first (databases)
echo "🗄️  Starting database services..."
docker-compose up -d mongo local-mongo redis local-redis

# Wait for databases to be ready
echo "⏳ Waiting for databases to start..."
sleep 10

# Start application services
echo "🖥️  Starting application services..."
docker-compose up -d backend local-server

# Wait a moment
sleep 5

# Start frontend
echo "🌐 Starting frontend..."
docker-compose up -d frontend

# Show status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🎉 CBT App is starting up!"
echo ""
echo "📱 Access URLs:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:4000"
echo "   Local Server: http://localhost:5000"
echo "   Health Check: http://localhost:4000/api/health"
echo ""
echo "🛠️  Development Commands:"
echo "   View logs:    docker-compose logs -f [service-name]"
echo "   Stop all:     docker-compose down"
echo "   Restart:      docker-compose restart [service-name]"
echo "   Rebuild:      docker-compose build --no-cache [service-name]"
echo ""
echo "📋 To view logs for all services:"
echo "   docker-compose logs -f"
