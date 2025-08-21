import mongoose from 'mongoose';

// Database connection helpers for tests
export const connectTestDB = async () => {
    // Skip actual DB connection for unit tests with mocks
    console.log('DB connection skipped for unit tests with mocks');
    return Promise.resolve();
};

export const disconnectTestDB = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
};

export const clearTestDB = async () => {
    // Skip DB operations for mocked tests
    console.log('DB clear skipped for unit tests with mocks');
    return Promise.resolve();
};

// Collection-specific cleanup
export const clearCollection = async (collectionName) => {
    if (mongoose.connection.readyState !== 0) {
        const collection = mongoose.connection.collections[collectionName];
        if (collection) {
            await collection.deleteMany({});
        }
    }
};

// Setup test database with clean state
export const setupTestDB = async () => {
    await connectTestDB();
    await clearTestDB();
};

// Teardown test database
export const teardownTestDB = async () => {
    await clearTestDB();
    await disconnectTestDB();
};

// Wait for database operations to complete
export const waitForDB = (ms = 100) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// Create test transaction
export const withTransaction = async (callback) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const result = await callback(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// Database state verification helpers
export const countDocuments = async (Model, query = {}) => {
    return await Model.countDocuments(query);
};

export const findDocuments = async (Model, query = {}, limit = 10) => {
    return await Model.find(query).limit(limit);
};

export const documentExists = async (Model, query) => {
    const doc = await Model.findOne(query);
    return !!doc;
};
