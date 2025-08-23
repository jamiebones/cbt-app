import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from 'redis';

describe('Redis Simple Connection Test', () => {
    let redisClient;

    beforeAll(async () => {
        // Direct Redis connection test
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6381';
        const redisPassword = process.env.REDIS_PASSWORD || 'test_redis_123';

        console.log('Testing Redis connection to:', redisUrl);
        console.log('Using password:', redisPassword ? 'Yes' : 'No');

        redisClient = createClient({
            url: redisUrl,
            password: redisPassword,
            socket: {
                connectTimeout: 5000,
            }
        });

        redisClient.on('error', (error) => {
            console.error('Redis client error:', error);
        });

        await redisClient.connect();
    }, 10000);

    afterAll(async () => {
        if (redisClient) {
            await redisClient.quit();
        }
    });

    it('should connect to Redis and perform basic operations', async () => {
        // Test ping
        const pong = await redisClient.ping();
        expect(pong).toBe('PONG');

        // Test set/get
        await redisClient.set('test-key', 'test-value');
        const value = await redisClient.get('test-key');
        expect(value).toBe('test-value');

        // Test cleanup
        await redisClient.del('test-key');
        const deletedValue = await redisClient.get('test-key');
        expect(deletedValue).toBeNull();
    });

    it('should handle hash operations', async () => {
        const hashKey = 'test-hash';

        await redisClient.hSet(hashKey, {
            field1: 'value1',
            field2: 'value2'
        });

        const field1 = await redisClient.hGet(hashKey, 'field1');
        expect(field1).toBe('value1');

        const allFields = await redisClient.hGetAll(hashKey);
        expect(allFields).toEqual({
            field1: 'value1',
            field2: 'value2'
        });

        await redisClient.del(hashKey);
    });

    it('should handle expiration', async () => {
        const key = 'test-expiry';

        await redisClient.setEx(key, 1, 'expires-soon'); // 1 second expiry

        let value = await redisClient.get(key);
        expect(value).toBe('expires-soon');

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 1100));

        value = await redisClient.get(key);
        expect(value).toBeNull();
    });
});
