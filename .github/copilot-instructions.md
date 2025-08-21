# CBT Application - AI Coding Agent Instructions

## Architecture Overview

This is a **monolithic MERN stack** Computer-Based Testing application with Docker containerization. The backend uses **ES6 modules** throughout (`"type": "module"` in package.json).

### Key Architectural Decisions

- **Monolithic Backend**: Single Express.js server with modular internal structure in `backend/src/modules/`
- **Hybrid Online/Offline**: Same backend codebase serves both online management and offline test delivery
- **Role-Based System**: `test_center_owner` → `test_creator` → `student` hierarchy
- **Subscription Tiers**: Free/premium limits enforced at service layer

## Code Quality & Performance Standards

### Performance Requirements (CRITICAL)

**All code written must be optimal for speed and execution:**

- **Big O Optimization**: Do NOT write code with quadratic (O(n²)) or exponential (O(2ⁿ)) time complexity
- **Prefer Linear Time**: Aim for O(n) or better time complexity in all algorithms
- **Database Efficiency**: Use proper indexing, lean queries, and aggregation pipelines
- **Memory Efficiency**: Avoid unnecessary object creation and memory leaks

### Code Style Standards

**All code should follow the established module pattern:**

- Use the exact module structure defined below
- Follow singleton pattern for services and controllers
- Maintain consistent import/export conventions
- Adhere to ES6 module syntax throughout

**Code should be simplistic and easy to understand:**

- Write self-documenting code with clear variable names
- Keep functions small and focused on single responsibilities
- Use meaningful comments for complex business logic
- Prefer readability over cleverness

### Collaborative Development Standards

**When the user suggests an edit or approach:**

- **Always evaluate for better alternatives** - Don't just implement what's suggested
- **Proactively suggest improvements** - If there's a more optimal, secure, or maintainable approach, recommend it
- **Explain the trade-offs** - Clearly communicate why an alternative approach might be better
- **Respect user preferences** - After explaining alternatives, implement what the user prefers
- **Focus on performance and maintainability** - Prioritize solutions that align with the performance standards above

## Development Patterns

### Module Structure (Critical Pattern)

All backend modules follow this exact structure:

```
backend/src/modules/{feature}/
├── service.js      # Business logic, singleton export
├── controller.js   # HTTP handlers, singleton export
├── routes.js       # Express routes, default export
└── middleware.js   # Feature-specific middleware (optional)
```

### Import/Export Conventions

```javascript
// Service Pattern (singleton)
class FeatureService { ... }
const featureService = new FeatureService();
export { featureService };

// Controller Pattern (singleton)
class FeatureController {
    constructor() { this.service = featureService; }
}
const featureController = new FeatureController();
export { featureController };

// Routes Pattern (default export)
import { featureController } from './controller.js';
const router = express.Router();
export default router;
```

### Database Integration

- **Models**: Located in `backend/src/models/`, use Mongoose with ES6 imports
- **MongoDB**: Authenticated setup with `cbt_user` application user
- **Redis**: Session/cache with password authentication
- **Indexes**: Always add for performance-critical fields

### Performance Patterns

- **Parallel Operations**: Use `Promise.all()` for independent async operations (see `subscriptions/service.js` `getUsageStats`)
- **Singleton Services**: All services are singletons to avoid memory overhead
- **Connection Pooling**: MongoDB and Redis connections managed in `config/` directory

#### Promise.all Optimization Pattern (CRITICAL)

**Always use `Promise.all()` for independent async operations to improve performance:**

```javascript
// ❌ SLOW - Sequential execution
const user = await User.findById(userId);
const subject = await Subject.findById(subjectId);
const questions = await Question.find({ subject: subjectId });

// ✅ FAST - Parallel execution
const [user, subject, questions] = await Promise.all([
  User.findById(userId),
  Subject.findById(subjectId),
  Question.find({ subject: subjectId }),
]);
```

**Common Optimization Scenarios:**

1. **Database Queries + Counts:**

```javascript
// ❌ Sequential
const questions = await Question.find(query);
const total = await Question.countDocuments(query);

// ✅ Parallel
const [questions, total] = await Promise.all([
  Question.find(query),
  Question.countDocuments(query),
]);
```

2. **Save + Update Stats:**

```javascript
// ❌ Sequential
await question.save();
await subject.updateStats();

// ✅ Parallel
await Promise.all([question.save(), subject.updateStats()]);
```

3. **Multiple Independent Validations:**

```javascript
// ❌ Sequential
const user = await User.findById(userId);
const subject = await Subject.findById(subjectId);
const permissions = await checkPermissions(userId);

// ✅ Parallel
const [user, subject, permissions] = await Promise.all([
  User.findById(userId),
  Subject.findById(subjectId),
  checkPermissions(userId),
]);
```

4. **Population + Stats Updates:**

```javascript
// ❌ Sequential
await model.populate([...]);
await relatedModel.updateStats();

// ✅ Parallel
await Promise.all([
    model.populate([...]),
    relatedModel.updateStats()
]);
```

**When NOT to use Promise.all:**

- When one operation depends on the result of another
- When you need error handling for each operation separately
- When operations should run in sequence for business logic reasons

## Critical File Locations

### Backend Core

- **Entry Point**: `backend/src/server.js` - ES6 module setup, route mounting
- **Models**: `backend/src/models/index.js` - Centralized model exports
- **Config**: `backend/src/config/` - Database, Redis, logging setup
- **Middleware**: `backend/src/middleware/` - Global error handling, 404 handling

### Module Examples

- **Auth Module**: `backend/src/modules/auth/` - JWT authentication, middleware
- **Subscriptions**: `backend/src/modules/subscriptions/` - Tier validation, usage limits
- **Users**: `backend/src/modules/users/` - Role-based user management

### Docker Setup

- **Development**: `docker-compose.yml` - Full stack with hot reload
- **Scripts**: `docker/dev-scripts.sh` - Convenience commands for container management
- **Init**: `docker/mongo-init/init-db.js` - MongoDB setup (MongoDB shell syntax, NOT Node.js)

## Development Workflow

### Starting Development

```bash
# Always use Docker for development
docker-compose up -d
# Or use convenience script
./docker/dev-scripts.sh start
```

### Service Ports (Development)

- Frontend: `3000` (React)
- Backend: `4000` (Main API)
- Local Server: `5000` (Offline delivery)
- MongoDB: `27017` (Main), `27018` (Local)
- Redis: `6379` (Main), `6380` (Local)

### Testing Commands

```bash
# Backend tests
cd backend && npm test
# Frontend tests
cd frontend && npm test
# Full Docker test
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## Common Patterns

### Subscription Validation

Always check subscription limits before operations:

```javascript
const validation = await subscriptionService.validateAction(
  userId,
  "createTest"
);
if (!validation.allowed) {
  return res.status(403).json({ message: validation.message });
}
```

### Error Handling

- Use `express-async-errors` for automatic async error handling
- All errors go through `middleware/errorHandler.js`
- Use structured logging with `config/logger.js`

### Authentication Flow

- JWT tokens in headers: `Authorization: Bearer <token>`
- Middleware: `modules/auth/middleware.js` `authenticate` function
- User roles checked at route/controller level

### Database Queries

- Use Mongoose models from `models/index.js`
- Always handle promise rejections
- Use lean queries for read-only operations
- Index frequently queried fields

## Integration Points

### Frontend-Backend Communication

- API Base URL: `http://localhost:4000/api`
- All routes prefixed with `/api/{module}`
- CORS configured for development origins

### Docker Container Communication

- Services communicate via Docker network `cbt-network`
- Internal hostnames: `mongo`, `redis`, `backend`, `frontend`
- Environment variables in `.env` file (copy from `.env.example`)

### MongoDB Authentication

- Root admin: `admin:dev_password_123`
- Application user: `cbt_user:cbt_password_123`
- Database: `cbt_app` (main), `cbt_local` (offline)

## Common Mistakes to Avoid

1. **Wrong Import Syntax**: This is ES6 modules - use `import/export`, not `require/module.exports`
2. **MongoDB Init Scripts**: Use MongoDB shell syntax, NOT Node.js (no `require`, `process.env`)
3. **Service Instantiation**: Services are singletons - import the instance, don't create new ones
4. **Environment Variables**: Only import `dotenv` once in `server.js`, not in every file
5. **Route Mounting**: Mount routes in `server.js` with `/api` prefix

## Next Implementation Phase

Based on current progress, the next major tasks are:

1. **Test & Question Management**: Complete CRUD operations for tests and questions
2. **Excel Import System**: Bulk question import with validation
3. **Test Taking Interface**: Student test session management
4. **Analytics & Reporting**: Performance tracking and report generation

When implementing new features, follow the established module pattern and maintain consistency with existing subscription validation and authentication flows.

## Comprehensive Testing Strategy

### Test Structure & Organization

```
backend/src/tests/
├── setup.js                    # Global test setup
├── helpers/                    # Test utilities
│   ├── testData.js            # Mock data generators
│   ├── dbHelpers.js           # Database setup/teardown
│   └── authHelpers.js         # Authentication helpers
├── unit/                       # Unit tests for services
│   ├── auth.service.test.js
│   ├── users.service.test.js
│   ├── subjects.service.test.js
│   ├── questions.service.test.js
│   ├── tests.service.test.js
│   ├── testSessions.service.test.js
│   └── subscriptions.service.test.js
├── integration/                # Integration tests
│   ├── auth.integration.test.js
│   ├── questionBank.integration.test.js
│   └── testWorkflow.integration.test.js
└── e2e/                       # End-to-end workflow tests
    └── completeTestFlow.e2e.test.js
```

### Service Testing Requirements

**For Each Service, Test:**

1. **Happy Path Scenarios** - Normal operations
2. **Error Handling** - Invalid inputs, not found, permissions
3. **Edge Cases** - Boundary conditions, empty data
4. **Security** - Authorization, data sanitization
5. **Performance** - Parallel operations with Promise.all
6. **Data Integrity** - Proper saving, relationships

**100% Coverage Goals:**

- Statements: 100%
- Branches: 100%
- Functions: 100%
- Lines: 100%

**Priority Testing Areas:**

1. Authentication Security - JWT, password hashing, rate limiting
2. Authorization - Role-based access, ownership validation
3. Data Validation - Input sanitization, schema validation
4. Business Logic - Subscription limits, test scoring
5. Error Handling - Graceful failure, proper error messages

### Test Implementation Phases

**Phase 1: Core Services** - AuthService, UsersService, QuestionsService
**Phase 2: Business Logic** - SubjectsService, TestsService, SubscriptionsService
**Phase 3: Advanced** - TestSessionsService, Analytics
**Phase 4: Integration & E2E** - Cross-service workflows, complete user journeys
