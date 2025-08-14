// MongoDB initialization script for CBT monolithic application

// Switch to admin database for user creation
db = db.getSiblingDB('admin');

// Create main application database for monolithic architecture
const appDb = db.getSiblingDB('cbt_app');

// Create collections and indexes for the monolithic application
print('Initializing CBT application database...');

// Users collection (includes all user types: test center owners, test creators, students)
appDb.users.createIndex({ email: 1 }, { unique: true });
appDb.users.createIndex({ testCenter: 1 });
appDb.users.createIndex({ role: 1 });

// Test Centers collection
appDb.testCenters.createIndex({ ownerId: 1 });
appDb.testCenters.createIndex({ name: 1 });

// Tests collection
appDb.tests.createIndex({ testCenter: 1 });
appDb.tests.createIndex({ createdBy: 1 });
appDb.tests.createIndex({ createdAt: -1 });
appDb.tests.createIndex({ status: 1 });

// Questions collection (includes question bank)
appDb.questions.createIndex({ testId: 1 });
appDb.questions.createIndex({ subject: 1 });
appDb.questions.createIndex({ questionBank: 1 });
appDb.questions.createIndex({ testCenter: 1 });

// Subjects collection (for question bank organization)
appDb.subjects.createIndex({ testCenter: 1 });
appDb.subjects.createIndex({ name: 1 });

// Test Sessions collection
appDb.testSessions.createIndex({ studentId: 1 });
appDb.testSessions.createIndex({ testId: 1 });
appDb.testSessions.createIndex({ startedAt: -1 });
appDb.testSessions.createIndex({ status: 1 });

// Test Results collection
appDb.testResults.createIndex({ testId: 1 });
appDb.testResults.createIndex({ studentId: 1 });
appDb.testResults.createIndex({ testCenter: 1 });
appDb.testResults.createIndex({ completedAt: -1 });

// Subscriptions collection
appDb.subscriptions.createIndex({ testCenter: 1 }, { unique: true });
appDb.subscriptions.createIndex({ tier: 1 });
appDb.subscriptions.createIndex({ expiresAt: 1 });

// Sessions collection (for authentication)
appDb.sessions.createIndex({ userId: 1 });
appDb.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Media files collection
appDb.mediaFiles.createIndex({ testId: 1 });
appDb.mediaFiles.createIndex({ questionId: 1 });
appDb.mediaFiles.createIndex({ testCenter: 1 });

// Sync logs collection (for online/local synchronization)
appDb.syncLogs.createIndex({ testCenter: 1 });
appDb.syncLogs.createIndex({ syncedAt: -1 });
appDb.syncLogs.createIndex({ status: 1 });

print('CBT application database initialized successfully');

// Create local database for offline operations
const localDb = db.getSiblingDB('cbt_local');

// Create the same structure for local database
print('Initializing CBT local database...');

// Copy the same indexes for local database
localDb.users.createIndex({ email: 1 }, { unique: true });
localDb.users.createIndex({ testCenter: 1 });
localDb.users.createIndex({ role: 1 });

localDb.tests.createIndex({ testCenter: 1 });
localDb.tests.createIndex({ createdBy: 1 });
localDb.tests.createIndex({ createdAt: -1 });

localDb.questions.createIndex({ testId: 1 });
localDb.questions.createIndex({ subject: 1 });

localDb.testSessions.createIndex({ studentId: 1 });
localDb.testSessions.createIndex({ testId: 1 });
localDb.testSessions.createIndex({ startedAt: -1 });

localDb.testResults.createIndex({ testId: 1 });
localDb.testResults.createIndex({ studentId: 1 });
localDb.testResults.createIndex({ completedAt: -1 });

localDb.sessions.createIndex({ userId: 1 });
localDb.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print('CBT local database initialized successfully');
print('MongoDB initialization completed successfully');