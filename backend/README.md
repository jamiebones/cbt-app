# CBT Backend Server

Monolithic backend server for the Computer-Based Test (CBT) Application built with Express.js, MongoDB, and Redis.

## Architecture

This is a monolithic backend server with a modular internal structure:

- **auth/**: Authentication and authorization
- **users/**: User management and registration
- **tests/**: Test creation and management
- **media/**: File upload and media processing
- **subscriptions/**: Subscription tier management
- **sync/**: Data synchronization between online and local servers
- **analytics/**: Test results and reporting

## Features

- ✅ Modular monolithic architecture
- ✅ Health check endpoints
- ✅ MongoDB and Redis integration
- ✅ Docker containerization
- ✅ Comprehensive logging
- ✅ Error handling middleware
- ✅ Dependency injection container
- ✅ Rate limiting and security headers
- ✅ CORS configuration
- ✅ Environment-based configuration

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- MongoDB
- Redis

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker Compose (Recommended):**
   ```bash
   # From project root
   npm run dev
   ```

4. **Or start locally:**
   ```bash
   npm run dev
   ```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## API Endpoints

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health with dependencies
- `GET /api/health/ready` - Readiness check
- `GET /api/health/live` - Liveness check

### Authentication (TODO)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/me` - Get current user

### Users (TODO)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Tests (TODO)
- `GET /api/tests` - Get all tests
- `GET /api/tests/:id` - Get test by ID
- `POST /api/tests` - Create test
- `PUT /api/tests/:id` - Update test
- `DELETE /api/tests/:id` - Delete test

### Media (TODO)
- `POST /api/media/upload/image` - Upload image
- `POST /api/media/upload/audio` - Upload audio
- `GET /api/media/:id` - Get media file
- `DELETE /api/media/:id` - Delete media file

### Subscriptions (TODO)
- `GET /api/subscriptions/:centerId` - Get subscription
- `POST /api/subscriptions/:centerId/upgrade` - Upgrade subscription
- `GET /api/subscriptions/:centerId/limits` - Get subscription limits

### Sync (TODO)
- `POST /api/sync/download/users` - Download users for local server
- `POST /api/sync/download/tests` - Download tests for local server
- `POST /api/sync/upload/results` - Upload results from local server

### Analytics (TODO)
- `GET /api/analytics/results/:testId` - Get test results
- `GET /api/analytics/performance/:centerId` - Get center performance
- `GET /api/analytics/export/csv/:testId` - Export results as CSV

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `4000` |
| `MONGODB_URL` | MongoDB connection string | `mongodb://mongo:27017/cbt_app` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Required |
| `UPLOAD_PATH` | File upload directory | `/app/uploads` |
| `MAX_FILE_SIZE` | Maximum file size in bytes | `10485760` (10MB) |
| `LOG_LEVEL` | Logging level | `debug` |

## Docker

### Build Image
```bash
docker build -t cbt-backend .
```

### Run Container
```bash
docker run -p 4000:4000 --env-file .env cbt-backend
```

### Health Check
The container includes health checks that ping `/api/health` every 30 seconds.

## Logging

Logs are written to:
- Console (formatted for development)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

Log levels: `error`, `warn`, `info`, `http`, `debug`

## Module Structure

Each module follows this structure:
```
src/modules/{module}/
├── routes.js      # Express routes
├── controller.js  # Route handlers
├── service.js     # Business logic (TODO)
├── model.js       # Database models (TODO)
└── validation.js  # Input validation (TODO)
```

## Dependency Injection

The application uses a simple dependency injection container located in `src/config/container.js`. Services can be registered and resolved with their dependencies.

## Error Handling

- Global error handler catches all unhandled errors
- Mongoose validation errors are properly formatted
- JWT errors return appropriate HTTP status codes
- Development mode includes stack traces

## Security

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation (TODO)
- JWT authentication (TODO)

## Next Steps

1. Implement authentication module
2. Implement user management module
3. Implement test management module
4. Add input validation
5. Add database models
6. Add business logic services
7. Add comprehensive tests

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Follow ESLint rules
5. Use conventional commit messages