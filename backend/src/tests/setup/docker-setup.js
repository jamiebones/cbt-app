import { beforeAll } from 'vitest';

beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

    console.log('Docker test environment configured');
});
