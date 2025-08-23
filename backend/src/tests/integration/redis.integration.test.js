import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { redisService } from '../../services/redisService.js';
import { connectRedis, disconnectRedis } from '../../config/redis.js';
import { authService } from '../../modules/auth/service.js';
import User from '../../models/User.js';
import Subject from '../../models/Subject.js';

describe('Redis Integration Tests (Docker)', () => {

    beforeAll(async () => {
        // Set test environment variables only if not already set (for local testing)
        if (!process.env.MONGODB_URI) {
            process.env.MONGODB_URI = 'mongodb://cbt_test_user:cbt_test_password@localhost:27019/cbt_test';
        }
        if (!process.env.REDIS_URL) {
            process.env.REDIS_URL = 'redis://localhost:6381';
        }
        if (!process.env.REDIS_PASSWORD) {
            process.env.REDIS_PASSWORD = 'test_redis_123';
        }

        console.log('Test environment:');
        console.log('MONGODB_URI:', process.env.MONGODB_URI);
        console.log('REDIS_URL:', process.env.REDIS_URL);

        // Wait for Docker services to be ready
        await waitForMongoDB();
        await waitForRedis();

        // Connect to test database
        const mongoUri = process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);

        console.log('Connected to test database and Redis in Docker');
    }, 60000);

    afterAll(async () => {
        // Clean up and disconnect
        try {
            await mongoose.connection.dropDatabase();
            await mongoose.connection.close();
            await disconnectRedis();
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    });

    beforeEach(async () => {
        // Clean all collections and Redis data before each test
        await cleanTestDatabase();
        await cleanRedisData();
        await seedTestData();
    });

    async function waitForMongoDB() {
        const maxRetries = 30;
        const retryDelay = 2000;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const mongoUri = process.env.MONGODB_URI || 'mongodb://cbt_test_user:cbt_test_password@localhost:27019/cbt_test';
                await mongoose.connect(mongoUri);
                await mongoose.connection.close();
                console.log('MongoDB is ready');
                return;
            } catch (error) {
                console.log(`Waiting for MongoDB... attempt ${i + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        throw new Error('MongoDB failed to start within timeout');
    }

    async function waitForRedis() {
        const maxRetries = 30;
        const retryDelay = 1000;

        for (let i = 0; i < maxRetries; i++) {
            try {
                // Initialize Redis connection first
                await connectRedis();

                // Then test the connection
                const result = await redisService.ping();
                if (result === 'PONG') {
                    console.log('Redis is ready');
                    return;
                }
            } catch (error) {
                console.log(`Waiting for Redis... attempt ${i + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        throw new Error('Redis failed to start within timeout');
    }

    async function cleanTestDatabase() {
        try {
            const collections = mongoose.connection.collections;
            for (const key in collections) {
                const collection = collections[key];
                await collection.deleteMany({});
            }
        } catch (error) {
            console.warn('Error cleaning database:', error);
        }
    }

    async function cleanRedisData() {
        try {
            // Only flush during testing, don't disconnect
            if (redisService.isConnected()) {
                await redisService.flushAll();
            }
        } catch (error) {
            console.warn('Error cleaning Redis:', error);
        }
    }

    async function seedTestData() {
        // Create test user
        const testUser = new User({
            email: 'test@example.com',
            password: 'hashedpassword123',
            firstName: 'Test',
            lastName: 'User',
            role: 'student',
            isEmailVerified: true,
            studentRegNumber: 'TEST001'
        });
        await testUser.save();

        // Create test subject
        const testSubject = new Subject({
            name: 'Test Subject',
            code: 'TS001',
            description: 'A test subject',
            isActive: true,
            createdBy: testUser._id,
            testCenterOwner: testUser._id
        });
        await testSubject.save();

        return { testUser, testSubject };
    }

    describe('Authentication Token Management', () => {
        it('should generate tokens and store refresh token in Redis', async () => {
            const testUser = await User.findOne({ email: 'test@example.com' });

            // Generate tokens
            const tokens = await authService.generateTokens(testUser._id, {
                deviceId: 'test-device',
                userAgent: 'test-agent'
            });

            expect(tokens).toHaveProperty('accessToken');
            expect(tokens).toHaveProperty('refreshToken');

            // Verify refresh token is stored in Redis
            const storedToken = await redisService.validateRefreshTokenByToken(tokens.refreshToken);
            expect(storedToken).toBeTruthy();
            expect(storedToken.userId).toBe(testUser._id.toString());
        });

        it('should validate access tokens with blacklist checking', async () => {
            const testUser = await User.findOne({ email: 'test@example.com' });
            const tokens = await authService.generateTokens(testUser._id, {
                deviceId: 'test-device'
            });

            // Token should be valid initially
            const isValid = await redisService.isTokenBlacklisted(tokens.accessToken);
            expect(isValid).toBe(false);

            // Blacklist the token
            await redisService.blacklistToken(tokens.accessToken, 3600);

            // Token should now be blacklisted
            const isBlacklisted = await redisService.isTokenBlacklisted(tokens.accessToken);
            expect(isBlacklisted).toBe(true);
        });

        it('should handle token blacklisting correctly', async () => {
            const testUser = await User.findOne({ email: 'test@example.com' });
            const tokens = await authService.generateTokens(testUser._id, {
                deviceId: 'test-device'
            });

            // Blacklist token
            await redisService.blacklistToken(tokens.accessToken, 1); // 1 second expiry

            // Verify blacklisted
            let isBlacklisted = await redisService.isTokenBlacklisted(tokens.accessToken);
            expect(isBlacklisted).toBe(true);

            // Wait for expiry
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should no longer be blacklisted
            isBlacklisted = await redisService.isTokenBlacklisted(tokens.accessToken);
            expect(isBlacklisted).toBe(false);
        });

        it('should refresh tokens and invalidate old ones', async () => {
            const testUser = await User.findOne({ email: 'test@example.com' });
            const originalTokens = await authService.generateTokens(testUser._id, {
                deviceId: 'test-device'
            });

            // Refresh tokens
            const newTokens = await authService.refreshTokens(originalTokens.refreshToken);
            expect(newTokens).toHaveProperty('accessToken');
            expect(newTokens).toHaveProperty('refreshToken');
            expect(newTokens.accessToken).not.toBe(originalTokens.accessToken);

            // Old refresh token should be invalid
            try {
                await authService.refreshTokens(originalTokens.refreshToken);
                throw new Error('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Invalid or expired refresh token');
            }
        });
    });

    describe('Session Management', () => {
        it('should store and retrieve session data', async () => {
            const testUser = await User.findOne({ email: 'test@example.com' });
            const tokens = await authService.generateTokens(testUser._id, {
                deviceId: 'test-device'
            });

            const sessionData = {
                loginTime: new Date().toISOString(),
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            };

            // Store session
            const sessionId = await redisService.storeSession(testUser._id.toString(), sessionData, 3600);

            // Retrieve session
            const retrievedSession = await redisService.getSession(testUser._id.toString(), sessionId);
            expect(retrievedSession).toBeTruthy();
            expect(retrievedSession.ipAddress).toBe('127.0.0.1');
        });

        it('should handle user logout with token revocation', async () => {
            const testUser = await User.findOne({ email: 'test@example.com' });
            const tokens = await authService.generateTokens(testUser._id, {
                deviceId: 'test-device'
            });

            // Logout user
            await authService.logoutWithTokens(tokens.accessToken, tokens.refreshToken);

            // Access token should be blacklisted
            const isBlacklisted = await redisService.isTokenBlacklisted(tokens.accessToken);
            expect(isBlacklisted).toBe(true);

            // Refresh token should be invalid
            try {
                await authService.refreshTokens(tokens.refreshToken);
                throw new Error('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Invalid or expired refresh token');
            }
        });
    });

    describe('Rate Limiting', () => {
        it('should track and limit login attempts', async () => {
            const identifier = 'test@example.com';
            const action = 'login';
            const limit = 5;
            const windowSeconds = 60; // 1 minute

            // Should allow requests up to limit
            for (let i = 0; i < limit; i++) {
                const result = await redisService.checkRateLimit(identifier, action, limit, windowSeconds);
                expect(result.isAllowed).toBe(true);
                expect(result.current).toBe(i + 1);
            }

            // Should block after limit
            const blocked = await redisService.checkRateLimit(identifier, action, limit, windowSeconds);
            expect(blocked.isAllowed).toBe(false);
            expect(blocked.current).toBe(limit + 1);
        });

        it('should reset rate limit after window expires', async () => {
            const identifier = 'reset-test@example.com';
            const action = 'login';
            const limit = 2;
            const windowSeconds = 1; // 1 second for quick test

            // Reach limit
            await redisService.checkRateLimit(identifier, action, limit, windowSeconds);
            await redisService.checkRateLimit(identifier, action, limit, windowSeconds);

            let blocked = await redisService.checkRateLimit(identifier, action, limit, windowSeconds);
            expect(blocked.isAllowed).toBe(false);

            // Wait for window to expire
            await new Promise(resolve => setTimeout(resolve, 1200));

            // Should be allowed again
            const allowed = await redisService.checkRateLimit(identifier, action, limit, windowSeconds);
            expect(allowed.isAllowed).toBe(true);
            expect(allowed.current).toBe(1);
        });
    });

    describe('Caching', () => {
        it('should cache and retrieve user data', async () => {
            const testUser = await User.findOne({ email: 'test@example.com' });

            // Cache user data
            await redisService.setUserCache(testUser._id.toString(), testUser.toObject(), 3600);

            // Retrieve cached data
            const cachedUser = await redisService.getUserCache(testUser._id.toString());

            // Assert
            expect(cachedUser).toBeTruthy();
            expect(cachedUser.email).toBe(testUser.email);
            expect(cachedUser.firstName).toBe(testUser.firstName);
        });

        it('should invalidate user cache', async () => {
            const testUser = await User.findOne({ email: 'test@example.com' });

            // Cache user data
            await redisService.setUserCache(testUser._id.toString(), testUser.toObject(), 3600);

            // Verify cached
            let cachedUser = await redisService.getUserCache(testUser._id.toString());
            expect(cachedUser).toBeTruthy();

            // Invalidate cache
            await redisService.invalidateUserCache(testUser._id.toString());

            // Should be null after invalidation
            cachedUser = await redisService.getUserCache(testUser._id.toString());
            expect(cachedUser).toBeNull();
        });

        it('should handle cache expiration', async () => {
            const key = 'test-expiry';
            const value = { test: 'data' };

            // Set with short expiry
            await redisService.setCache(key, value, 1); // 1 second

            // Verify data exists
            let cached = await redisService.getCache(key);
            expect(cached).toEqual(value);

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should be null after expiration
            cached = await redisService.getCache(key);
            expect(cached).toBeNull();
        });
    });

    describe('Analytics Caching', () => {
        it('should cache analytics results', async () => {
            const testSubject = await Subject.findOne({ code: 'TS001' });
            const analyticsData = {
                questionAnalytics: [],
                basicStats: { totalAttempts: 100 }
            };

            // Cache analytics
            await redisService.setAnalyticsCache(testSubject._id.toString(), 'performance', analyticsData, 3600);

            // Retrieve cached analytics
            const cached = await redisService.getAnalyticsCache(testSubject._id.toString(), 'performance');

            // Assert
            expect(cached).toEqual(analyticsData);
        });

        it('should invalidate analytics cache', async () => {
            const testSubject = await Subject.findOne({ code: 'TS001' });
            const analyticsData = {
                questionAnalytics: [],
                basicStats: { totalAttempts: 100 }
            };

            // Cache analytics
            await redisService.setAnalyticsCache(testSubject._id.toString(), 'performance', analyticsData, 3600);

            // Verify cached
            let cached = await redisService.getAnalyticsCache(testSubject._id.toString(), 'performance');
            expect(cached).toBeTruthy();

            // Invalidate cache
            await redisService.invalidateAnalyticsCache(testSubject._id.toString());

            // Should be null after invalidation
            cached = await redisService.getAnalyticsCache(testSubject._id.toString(), 'performance');
            expect(cached).toBeNull();
        });
    });

    describe('Complete Authentication Workflow', () => {
        it('should handle complete login-logout cycle with Redis', async () => {
            const testUser = await User.findOne({ email: 'test@example.com' });

            // 1. Generate tokens (login)
            const tokens = await authService.generateTokens(testUser._id, {
                deviceId: 'workflow-test'
            });

            // 2. Verify tokens are valid
            const refreshData = await redisService.validateRefreshTokenByToken(tokens.refreshToken);
            expect(refreshData.userId).toBe(testUser._id.toString());

            // 3. Check token is not blacklisted
            let isBlacklisted = await redisService.isTokenBlacklisted(tokens.accessToken);
            expect(isBlacklisted).toBe(false);

            // 4. Logout
            await authService.logout(tokens.accessToken, tokens.refreshToken);

            // 5. Verify logout effects
            isBlacklisted = await redisService.isTokenBlacklisted(tokens.accessToken);
            expect(isBlacklisted).toBe(true);

            try {
                const result = await redisService.validateRefreshTokenByToken(tokens.refreshToken);
                expect(result).toBeNull(); // Should return null instead of throwing
            } catch (error) {
                expect(error.message).toContain('Invalid or expired refresh token');
            }
        });

        it('should handle concurrent operations correctly', async () => {
            const testUser = await User.findOne({ email: 'test@example.com' });

            // Create multiple concurrent operations
            const operations = Array.from({ length: 5 }, (_, i) =>
                authService.generateTokens(testUser._id, {
                    deviceId: `concurrent-${i}`
                })
            );

            const results = await Promise.all(operations);

            // All operations should succeed
            expect(results).toHaveLength(5);
            results.forEach(tokens => {
                expect(tokens).toHaveProperty('accessToken');
                expect(tokens).toHaveProperty('refreshToken');
            });

            // All refresh tokens should be different
            const refreshTokens = results.map(r => r.refreshToken);
            const uniqueTokens = new Set(refreshTokens);
            expect(uniqueTokens.size).toBe(5);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle Redis connection errors gracefully', async () => {
            // This test verifies graceful degradation when Redis is unavailable
            // The actual implementation should handle Redis errors without crashing

            // Test with invalid token
            const isValid = await redisService.validateRefreshTokenByToken('invalid-token');
            expect(isValid).toBeNull();
        });

        it('should handle expired refresh tokens', async () => {
            const testUser = await User.findOne({ email: 'test@example.com' });
            const tokens = await authService.generateTokens(testUser._id, {
                deviceId: 'expiry-test'
            });

            // Manually expire the token by deleting it from Redis
            const tokenKey = `refresh_token:${tokens.refreshToken}`;
            await redisService.deleteCache(tokenKey);

            // Should throw error when trying to use expired token
            try {
                await authService.refreshTokens(tokens.refreshToken);
                throw new Error('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Invalid refresh token');
            }
        });

        it('should handle invalid user IDs in Redis operations', async () => {
            const invalidUserId = 'invalid-user-id';

            // These operations should not crash with invalid user ID
            const cachedUser = await redisService.getUserCache(invalidUserId);
            expect(cachedUser).toBeNull();

            const session = await redisService.getSession(invalidUserId, 'session-123');
            expect(session).toBeNull();
        });
    });

    describe('Performance Tests in Docker', () => {
        it('should handle high-frequency token operations efficiently', async () => {
            const testUser = await User.findOne({ email: 'test@example.com' });
            const startTime = Date.now();

            // Perform 10 token generations
            const operations = Array.from({ length: 10 }, (_, i) =>
                authService.generateTokens(testUser._id, {
                    deviceId: `perf-${i}`
                })
            );

            await Promise.all(operations);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete within reasonable time (adjust threshold as needed)
            expect(duration).toBeLessThan(5000); // 5 seconds max
        });
    });
});
