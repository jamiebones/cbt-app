// MongoDB initialization script for CBT monolithic application

print('Starting MongoDB initialization...');

// Create application user for the main database
db = db.getSiblingDB('cbt_app');

// Create user with read/write access to cbt_app database
try {
    db.createUser({
        user: 'cbt_user',
        pwd: 'cbt_password_123',
        roles: [
            { role: 'readWrite', db: 'cbt_app' }
        ]
    });
    print('Created cbt_user for cbt_app database');
} catch (e) {
    print('User cbt_user already exists or error occurred: ' + e);
}

// Create collections and indexes
print('Initializing CBT application database...');

// Users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ testCenter: 1 });
db.users.createIndex({ role: 1 });

// Test Centers collection
db.testCenters.createIndex({ ownerId: 1 });
db.testCenters.createIndex({ name: 1 });

// Tests collection
db.tests.createIndex({ testCenter: 1 });
db.tests.createIndex({ createdBy: 1 });
db.tests.createIndex({ createdAt: -1 });
db.tests.createIndex({ status: 1 });

// Questions collection
db.questions.createIndex({ testId: 1 });
db.questions.createIndex({ subject: 1 });
db.questions.createIndex({ questionBank: 1 });
db.questions.createIndex({ testCenter: 1 });

// Test Sessions collection
db.testSessions.createIndex({ studentId: 1 });
db.testSessions.createIndex({ testId: 1 });
db.testSessions.createIndex({ startedAt: -1 });
db.testSessions.createIndex({ status: 1 });

// Test Results collection
db.testResults.createIndex({ testId: 1 });
db.testResults.createIndex({ studentId: 1 });
db.testResults.createIndex({ testCenter: 1 });
db.testResults.createIndex({ completedAt: -1 });

// Sessions collection
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print('CBT application database initialized successfully');
print('MongoDB initialization completed successfully');