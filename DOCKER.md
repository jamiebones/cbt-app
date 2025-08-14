# CBT Application - Docker Quick Start Guide

This guide helps you get the CBT (Computer-Based Test) application running with Docker in minutes.

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed
- At least 4GB RAM available
- Git installed

### 1. Clone and Setup

```bash
git clone <repository-url>
cd cbt-application

# Copy environment template
cp .env.example .env
```

### 2. Start Development Environment

```bash
# Option 1: Using convenience script (recommended)
chmod +x docker/dev-scripts.sh
./docker/dev-scripts.sh start

# Option 2: Using docker-compose directly
docker-compose up -d
```

### 3. Access the Application

- **Frontend (React)**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Local Server**: http://localhost:5000
- **Load Balancer**: http://localhost (when nginx is enabled)

### 4. View Logs (Optional)

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
```

## 🏗️ Architecture Overview

The application consists of:

### Frontend

- **React App** (Port 3000): Main user interface
- **NGINX**: Production web server and load balancer

### Backend Monolith

- **Backend Server** (Port 4000): Single Express.js application containing all business logic:
  - Authentication and authorization
  - User and test center management
  - Test creation and management
  - Question bank and subject organization
  - Subscription tier management
  - Online/offline synchronization
  - Test results and analytics processing
  - Image and audio file processing

### Local Components

- **Local Server** (Port 5000): Same monolithic backend codebase configured for offline test delivery

### Infrastructure

- **MongoDB** (Port 27017): Main database
- **Local MongoDB** (Port 27018): Offline database
- **Redis** (Port 6379): Main cache and sessions
- **Local Redis** (Port 6380): Offline cache

## 🛠️ Development Commands

### Using the Convenience Script

```bash
# Build all services
./docker/dev-scripts.sh build

# Start development environment
./docker/dev-scripts.sh start

# Start with visible logs
./docker/dev-scripts.sh start-logs

# Stop all services
./docker/dev-scripts.sh stop

# Restart a specific service
./docker/dev-scripts.sh restart frontend

# View logs for a service
./docker/dev-scripts.sh logs api-gateway

# Check service status
./docker/dev-scripts.sh status

# Reset databases (clean slate)
./docker/dev-scripts.sh reset-db

# Clean up everything
./docker/dev-scripts.sh cleanup

# Show help
./docker/dev-scripts.sh help
```

### Using Docker Compose Directly

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d frontend api-gateway mongo redis

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# Scale services
docker-compose up -d --scale api-gateway=2
```

## 🔧 Configuration

### Environment Variables

Key variables in `.env`:

```bash
# Database
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_jwt_secret_minimum_32_chars
REDIS_PASSWORD=your_redis_password

# Payment (for subscription features)
STRIPE_SECRET_KEY=sk_test_your_stripe_key
PAYPAL_CLIENT_ID=your_paypal_client_id
```

### Development vs Production

- **Development**: `docker-compose.yml` - Hot reload, debug ports, volume mounts
- **Production**: `docker-compose.prod.yml` - Optimized builds, resource limits, security

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use:**

   ```bash
   # Find what's using the port
   lsof -i :3000

   # Kill the process or change ports in docker-compose.yml
   ```

2. **Permission denied:**

   ```bash
   # Add user to docker group
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **Services won't start:**

   ```bash
   # Check logs
   docker-compose logs <service-name>

   # Reset everything
   ./docker/dev-scripts.sh cleanup
   ./docker/dev-scripts.sh start
   ```

4. **Database connection issues:**
   ```bash
   # Reset databases
   ./docker/dev-scripts.sh reset-db
   ```

### Health Checks

All services have health check endpoints:

```bash
# Check Backend API
curl http://localhost:4000/health

# Check Frontend
curl http://localhost:3000/health

# Check Local Server
curl http://localhost:5000/health
```

## 📊 Monitoring

### Service Status

```bash
# Check all services
docker-compose ps

# Check resource usage
docker stats

# Check service health
docker-compose ps --services --filter "status=running"
```

### Logs

```bash
# All services
docker-compose logs

# Specific service with follow
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## 🚀 Production Deployment

### Using Production Configuration

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Scale services for high availability
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Production Checklist

- [ ] Update all passwords in `.env`
- [ ] Configure SSL certificates
- [ ] Set up external managed databases
- [ ] Configure monitoring and alerting
- [ ] Set up backup strategies
- [ ] Review security settings

## 📚 Additional Resources

- **Detailed Documentation**: [docker/README.md](docker/README.md)
- **Service Architecture**: See individual service directories
- **API Documentation**: Available at http://localhost:4000/docs (when running)
- **Frontend Documentation**: [frontend/README.md](frontend/README.md)

## 🆘 Getting Help

1. **Check service logs**: `docker-compose logs <service>`
2. **Verify service health**: `docker-compose ps`
3. **Review environment variables**: Check `.env` file
4. **Reset everything**: `./docker/dev-scripts.sh cleanup && ./docker/dev-scripts.sh start`
5. **Check documentation**: [docker/README.md](docker/README.md)

## 🎯 Next Steps

After getting the application running:

1. **Explore the API**: Visit http://localhost:4000/docs
2. **Check the Frontend**: Open http://localhost:3000
3. **Review the Code**: Each service has its own directory with documentation
4. **Run Tests**: `docker-compose exec <service> npm test`
5. **Start Development**: Make changes and see them hot-reload automatically

Happy coding! 🎉
