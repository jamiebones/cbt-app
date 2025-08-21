// Test setup file for Vitest
import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URL = 'mongodb://localhost:27017/cbt_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Suppress console logs during tests
if (process.env.NODE_ENV === 'test') {
    console.log = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
}