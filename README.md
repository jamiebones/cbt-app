# CBT Application

A comprehensive Computer-Based Test (CBT) platform built with the MERN stack that enables test center owners to create and manage tests while allowing students to take these tests in a controlled environment.

## Features

- **Hybrid Architecture**: Online components for management, local components for secure test delivery
- **Rich Question Creation**: Support for multimedia questions (text, images, audio) with rich text formatting
- **Excel Import**: Bulk question import via Excel files
- **Question Bank**: Organized question repository by subjects
- **Student Management**: Online and local student registration
- **Offline Testing**: Local server for secure test administration without internet
- **Analytics**: Comprehensive test results and performance analytics
- **Subscription Tiers**: Free and paid tiers with different feature limits
- **Calculator Tool**: Built-in calculator for mathematical tests
- **Security**: Anti-cheating measures and secure test environment

## Technology Stack

### Frontend

- React 18+ with TypeScript
- React Router for navigation
- Tailwind CSS for styling
- React Context API for state management
- React-Quill for rich text editing
- Math.js for calculator functionality

### Backend

- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT authentication
- Redis for caching and sessions
- SheetJS for Excel processing
- Sharp for image processing

### Infrastructure

- Docker & Docker Compose
- MongoDB Atlas (production)
- Redis for caching
- NGINX for load balancing

## Project Structure

```
cbt-application/
├── frontend/           # React frontend application
├── backend/            # Express.js backend API
├── shared/             # Shared utilities and types
├── docker/             # Docker configuration files
├── docs/               # Documentation
└── .kiro/              # Kiro AI specifications
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- MongoDB (local or Atlas)
- Redis (optional, for caching)
- Docker (optional, for containerized development)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd cbt-application
   ```

2. **Install dependencies**

   ```bash
   npm run setup
   ```

3. **Environment Setup**

   ```bash
   # Copy environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env

   # Edit the .env files with your configuration
   ```

4. **Start development servers**

   ```bash
   npm run dev
   ```

   This will start:

   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Docker Development

```bash
# Start all services with Docker
npm run docker:dev

# Or use docker-compose directly
docker-compose -f docker-compose.dev.yml up
```

## Development

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only the frontend
- `npm run dev:backend` - Start only the backend
- `npm run build` - Build both frontend and backend for production
- `npm run test` - Run tests for both frontend and backend
- `npm run setup` - Install dependencies for all packages

### Environment Variables

#### Backend (.env)

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cbt_app
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
REDIS_URL=redis://localhost:6379
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

#### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENVIRONMENT=development
```

## Architecture

### Online Components

- User management and authentication
- Test center registration and management
- Test creation and question bank management
- Student registration
- Analytics and reporting
- Subscription management

### Local Server Components

- Secure test delivery
- Student authentication
- Test session management
- Result collection
- Data synchronization with online components

### Data Flow

1. Test centers register online and create tests
2. Students are registered online or locally
3. Test data is synchronized to local servers
4. Students take tests on local servers (offline capable)
5. Results are synchronized back to online components
6. Analytics and reports are generated online

## API Documentation

API documentation is available at `/api/docs` when running the backend server.

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: API endpoint and database testing
- **E2E Tests**: Complete user workflow testing

## Deployment

### Production Build

```bash
npm run build
```

### Docker Production

```bash
npm run docker:prod
```

### Environment Setup

1. Set up MongoDB Atlas cluster
2. Configure Redis instance
3. Set up CDN for media files
4. Configure environment variables
5. Set up monitoring and logging

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Use conventional commit messages
- Update documentation as needed

## Security

- JWT-based authentication with refresh tokens
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting
- File upload restrictions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- Create an issue in the repository
- Check the documentation in the `/docs` folder
- Review the API documentation at `/api/docs`

## Roadmap

- [ ] Advanced analytics and reporting
- [ ] Mobile app support
- [ ] AI-powered question generation
- [ ] Advanced proctoring features
- [ ] Integration with learning management systems
- [ ] Multi-language support
- [ ] Advanced question types (essay, coding, etc.)
