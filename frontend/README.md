# CBT Application Frontend

This is the React TypeScript frontend for the CBT (Computer Based Testing) application.

## Features

- **React 18** with TypeScript for type safety
- **React Router v6** for navigation
- **Authentication Context** with JWT token management
- **Protected Routes** with role-based access control
- **Hot Reload Development** with Docker volumes
- **Environment Configuration** for different deployment stages
- **Responsive Design** with CSS Grid and Flexbox

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── LoadingSpinner.tsx
│   └── ProtectedRoute.tsx
├── contexts/           # React contexts for state management
│   └── AuthContext.tsx
├── pages/             # Page components
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── TestsPage.tsx
│   ├── StudentsPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── TestTakingPage.tsx
│   └── NotFoundPage.tsx
├── services/          # API service layer
│   ├── api.ts
│   └── auth.ts
├── types/             # TypeScript type definitions
│   └── index.ts
├── utils/             # Utility functions and configuration
│   └── config.ts
├── hooks/             # Custom React hooks
├── App.tsx            # Main application component
├── index.tsx          # Application entry point
├── App.css           # Application styles
└── index.css         # Global styles
```

## Environment Variables

The application uses environment variables for configuration:

### Development (.env.development)
- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:4000)
- `REACT_APP_LOCAL_SERVER_URL`: Local server URL (default: http://localhost:5000)
- `REACT_APP_ENVIRONMENT`: Environment name
- Feature flags and limits

### Production (.env.production)
- Same variables but with production values

## Development Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose

### Running with Docker (Recommended)

1. Build and start the development container:
```bash
docker-compose up frontend
```

2. The application will be available at http://localhost:3000

3. Hot reloading is enabled - changes to source files will automatically reload the browser

### Running Locally

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.development .env.local
```

3. Start the development server:
```bash
npm start
```

## Available Scripts

- `npm start`: Start development server
- `npm build`: Build for production
- `npm test`: Run tests
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint issues
- `npm run format`: Format code with Prettier
- `npm run type-check`: Run TypeScript type checking

## Docker Development

The frontend is configured for hot-reload development in Docker:

- **Volume Mounting**: Source code is mounted as a volume for instant updates
- **Polling**: File watching is enabled for Docker compatibility
- **Node Modules**: Cached in anonymous volume for performance

## Authentication

The application uses JWT-based authentication with:

- **Login/Register**: User authentication flows
- **Token Management**: Automatic token refresh
- **Protected Routes**: Role-based access control
- **Local Storage**: Secure token storage

## API Integration

- **Axios**: HTTP client with interceptors
- **Error Handling**: Centralized error management
- **File Uploads**: Multipart form data support
- **Network Detection**: Online/offline status

## Features Implementation Status

- [x] Project structure setup
- [x] TypeScript configuration
- [x] Authentication context
- [x] Protected routes
- [x] API service layer
- [x] Environment configuration
- [x] Docker containerization
- [ ] Login/Register forms
- [ ] Dashboard implementation
- [ ] Test management UI
- [ ] Student management
- [ ] Test taking interface
- [ ] Analytics dashboard

## Next Steps

1. Implement login and registration forms
2. Create dashboard layout and navigation
3. Build test management interface
4. Implement student management
5. Create test taking interface
6. Add analytics and reporting
7. Implement offline capabilities

## Code Quality

The project includes:

- **ESLint**: Code linting with TypeScript support
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Husky**: Git hooks (to be added)
- **Testing**: Jest and React Testing Library (to be configured)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Code splitting with React.lazy()
- Optimized bundle size
- CDN-ready static assets
- Service worker for offline support (to be implemented)
