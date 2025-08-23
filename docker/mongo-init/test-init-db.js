// MongoDB shell script for test database initialization
db = db.getSiblingDB('cbt_test');

// Create test application user
db.createUser({
    user: 'cbt_test_user',
    pwd: 'cbt_test_password',
    roles: [
        {
            role: 'readWrite',
            db: 'cbt_test'
        }
    ]
});

// Create indexes for test performance
db.testsessions.createIndex({ "test": 1, "status": 1 });
db.testsessions.createIndex({ "testCenterOwner": 1, "createdAt": 1 });
db.testsessions.createIndex({ "student": 1, "testCenterOwner": 1 });
db.tests.createIndex({ "creator": 1 });
db.users.createIndex({ "email": 1 });

print('Test database initialized successfully with indexes');
