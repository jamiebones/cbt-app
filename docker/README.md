# CBT Application Docker Setup

This directory contains Docker configuration files and scripts for the CBT (Computer-Based Test) application.

## Architecture Overview

The CBT application uses a microservices architecture with the following components:

### Frontend Services

- **Frontend**: React application served via NGINX

### Backend Monolith

- **Backend Server**: Single Express.js application containing all business logic modules:
  - Authentication and authorization
  - User and test center management
  - Test creation and management
  - Question bank and subject organization
  - Subscription tier management
  - Data synchronization between online and local servers
  - Test results and analytics processing
  - Image and audio file processing

### Local Components

- **Local Server**: Same monolithic backend codebase configured for offline test delivery

### Infrastructure Services

- **MongoDB**: Primary database (with local instance for offline operation)
- **Redis**: Caching and session storage (with local instance)
- **NGINX**: Load balancer and reverse proxy

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available for containers
- Ports 80, 3000-3007, 5000, 6379-6380, 27017-27018 available

### Development Setup

1. **Clone and navigate to the project:**

   ```bash
   git clone <repository-url>
   cd cbt-application
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

3. **Start the development environment:**

   ```bash
   # Using the convenience script
   ./docker/dev-scripts.sh start

   # Or using docker-compose directly
   docker-compose up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:4000
   - Local Server: http://localhost:5000
   - Load Balancer: http://localhost (when nginx profile is active)

### Development Scripts

The `dev-scripts.sh` provides convenient commands for development:

```bash
# Build all services
./docker/dev-scripts.sh build

# Start development environment
./docker/dev-scripts.sh start

# Start with logs visible
./docker/dev-scripts.sh start-logs

# Stop all services
./docker/dev-scripts.sh stop

# Restart a specific service
./docker/dev-scripts.sh restart frontend

# View logs for a service
./docker/dev-scripts.sh logs api-gateway

# Check service status
./docker/dev-scripts.sh status

# Reset databases
./docker/dev-scripts.sh reset-db

# Clean up everything
./docker/dev-scripts.sh cleanup
```

## Configuration Files

### docker-compose.yml

Main development configuration with:

- Hot reload for all services
- Volume mounts for development
- Development-optimized settings
- All services exposed on host ports

### docker-compose.prod.yml

Production configuration with:

- Optimized builds
- Resource limits
- Health checks
- Security hardening
- Load balancing

### nginx/nginx.conf

NGINX configuration providing:

- Reverse proxy for all services
- Rate limiting
- Security headers
- Static file caching
- CORS handling

### mongo-init/init-db.js

MongoDB initialization script that:

- Creates application databases
- Sets up indexes for optimal performance
- Configures initial collections

## Service Architecture

### Multi-stage Dockerfiles

All services use multi-stage builds:

- **deps**: Production dependencies only
- **development**: Development dependencies + hot reload
- **production**: Optimized production build

### Volume Strategy

- **Development**: Source code mounted for hot reload
- **Production**: Persistent volumes for data only
- **Media**: Shared volumes for file storage

### Networking

- All services communicate via `cbt-network`
- Service discovery using container names
- External access through defined ports

## Environment Variables

Key environment variables (see `.env.example` for complete list):

### Database

- `MONGO_ROOT_USERNAME`: MongoDB admin username
- `MONGO_ROOT_PASSWORD`: MongoDB admin password
- `REDIS_PASSWORD`: Redis authentication password

### Security

- `JWT_SECRET`: JWT signing secret
- `JWT_REFRESH_SECRET`: JWT refresh token secret
- `SESSION_SECRET`: Session encryption secret

### External Services

- `STRIPE_SECRET_KEY`: Stripe payment processing
- `PAYPAL_CLIENT_ID`: PayPal payment processing
- `SMTP_*`: Email configuration

## Development Workflow

### Hot Reload

All services support hot reload in development:

- Frontend: React hot reload
- Backend services: Nodemon automatic restart
- Configuration changes: Manual restart required

### Debugging

- All services expose debug ports in development
- Logs available via `docker-compose logs`
- Health checks on all services

### Testing

- Test databases isolated from development data
- Test containers can be run alongside development
- Database reset functionality for clean testing

## Production Deployment

### Using Production Compose

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale api-gateway=3
```

### Production Considerations

- Use external managed databases (MongoDB Atlas, Redis Cloud)
- Configure SSL certificates for NGINX
- Set up proper monitoring and logging
- Use container orchestration (Kubernetes, Docker Swarm)
- Implement backup strategies

## Monitoring and Logging

### Health Checks

All services include health check endpoints:

- Frontend: `/health`
- Backend services: `/health`
- Databases: Built-in health checks

### Logging

- Structured logging with correlation IDs
- Log aggregation via Docker logging drivers
- Development: Console output
- Production: File-based with rotation

### Metrics

- Prometheus metrics endpoints on all services
- Grafana dashboards for visualization
- Custom business metrics tracking

## Troubleshooting

### Common Issues

1. **Port conflicts:**

   ```bash
   # Check what's using ports
   netstat -tulpn | grep :3000

   # Stop conflicting services
   sudo systemctl stop apache2
   ```

2. **Permission issues:**

   ```bash
   # Fix Docker permissions
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **Database connection issues:**

   ```bash
   # Reset databases
   ./docker/dev-scripts.sh reset-db

   # Check database logs
   docker-compose logs mongo
   ```

4. **Memory issues:**

   ```bash
   # Check Docker resource usage
   docker stats

   # Increase Docker memory limit
   # Docker Desktop: Settings > Resources > Memory
   ```

### Service Dependencies

Services start in dependency order:

1. Infrastructure (MongoDB, Redis)
2. Core services (Auth, User)
3. Business services (Test, Subscription)
4. Processing services (Media, Analytics)
5. Frontend and Gateway

### Data Persistence

- Database data: Persistent volumes
- Media files: Host-mounted volumes
- Logs: Configurable retention
- Cache: Redis persistence enabled

## Security Considerations

### Development Security

- Default passwords in `.env` (change for production)
- Services isolated in Docker network
- No external database access by default

### Production Security

- Use secrets management
- Enable SSL/TLS
- Configure firewall rules
- Regular security updates
- Audit logging enabled

## Performance Optimization

### Development

- Parallel builds enabled
- Optimized layer caching
- Minimal development images

### Production

- Multi-stage builds for smaller images
- Resource limits prevent resource exhaustion
- Health checks ensure service availability
- Load balancing for scalability

## Backup and Recovery

### Database Backups

```bash
# MongoDB backup
docker exec mongo mongodump --out /backup

# Redis backup
docker exec redis redis-cli BGSAVE
```

### Volume Backups

```bash
# Backup volumes
docker run --rm -v mongo_data:/data -v $(pwd):/backup alpine tar czf /backup/mongo_backup.tar.gz /data
```

### Disaster Recovery

- Database replication configured
- Volume snapshots for point-in-time recovery
- Service restart policies for automatic recovery

## Contributing

When adding new services:

1. Create Dockerfile with multi-stage build
2. Add service to docker-compose.yml
3. Create .dockerignore file
4. Add health check endpoint
5. Update this documentation

## Support

For issues with the Docker setup:

1. Check service logs: `docker-compose logs <service>`
2. Verify service health: `docker-compose ps`
3. Review environment variables
4. Check port availability
5. Consult troubleshooting section above
