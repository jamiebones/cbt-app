import { getRedisClient, connectRedis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import crypto from 'crypto';

class RedisService {
    constructor() {
        this.redisClient = null;
        this.keyPrefixes = {
            REFRESH_TOKEN: 'auth:refresh_tokens',
            RATE_LIMIT: 'auth:rate_limit',
            SESSION: 'auth:sessions',
            USER_CACHE: 'cache:user',
            TEST_CACHE: 'cache:test',
            ANALYTICS_CACHE: 'cache:analytics',
            BLACKLIST: 'auth:blacklist'
        };
    }

    getClient() {
        if (!this.redisClient) {
            this.redisClient = getRedisClient();
        }
        return this.redisClient;
    }

    // ============ USER CACHE ============

    /**
     * Set user cache
     * @param {string} userId - User ID
     * @param {Object} userData - User data to cache
     * @param {number} ttl - Time to live in seconds (default: 3600)
     */
    async setUserCache(userId, userData, ttl = 3600) {
        try {
            const client = this.getClient();
            const key = `${this.keyPrefixes.USER_CACHE}:${userId}`;
            await client.setEx(key, ttl, JSON.stringify(userData));
            logger.info(`User cache set for ${userId}`);
        } catch (error) {
            logger.error('Failed to set user cache:', error);
            throw error;
        }
    }

    /**
     * Get user cache
     * @param {string} userId - User ID
     */
    async getUserCache(userId) {
        try {
            const client = this.getClient();
            const key = `${this.keyPrefixes.USER_CACHE}:${userId}`;
            const cached = await client.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            logger.error('Failed to get user cache:', error);
            return null;
        }
    }

    // ============ ANALYTICS CACHE ============

    /**
     * Set analytics cache
     * @param {string} subjectId - Subject ID
     * @param {string} type - Analytics type
     * @param {Object} data - Analytics data to cache
     * @param {number} ttl - Time to live in seconds (default: 1800)
     */
    async setAnalyticsCache(subjectId, type, data, ttl = 1800) {
        try {
            const client = this.getClient();
            const key = `${this.keyPrefixes.ANALYTICS_CACHE}:${subjectId}:${type}`;
            await client.setEx(key, ttl, JSON.stringify(data));
            logger.info(`Analytics cache set for ${subjectId}:${type}`);
        } catch (error) {
            logger.error('Failed to set analytics cache:', error);
            throw error;
        }
    }

    /**
     * Get analytics cache
     * @param {string} subjectId - Subject ID
     * @param {string} type - Analytics type
     */
    async getAnalyticsCache(subjectId, type) {
        try {
            const client = this.getClient();
            const key = `${this.keyPrefixes.ANALYTICS_CACHE}:${subjectId}:${type}`;
            const cached = await client.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            logger.error('Failed to get analytics cache:', error);
            return null;
        }
    }

    /**
     * Invalidate analytics cache by pattern
     * @param {string} pattern - Cache key pattern
     */
    async invalidateAnalyticsCache(pattern) {
        try {
            const client = this.getClient();
            const searchKey = `${this.keyPrefixes.ANALYTICS_CACHE}:${pattern}*`;
            const keys = await client.keys(searchKey);

            if (keys.length > 0) {
                await client.del(keys);
                logger.info(`Invalidated analytics cache`, { pattern, count: keys.length });
            }
        } catch (error) {
            logger.error('Failed to invalidate analytics cache:', error);
        }
    }

    // ============ HEALTH CHECK ============

    /**
     * Ping Redis to check connection
     * @returns {Promise<string>} PONG if successful
     */
    async ping() {
        try {
            const client = this.getClient();
            return await client.ping();
        } catch (error) {
            logger.error('Redis ping failed:', error);
            throw error;
        }
    }

    // ============ REFRESH TOKEN MANAGEMENT ============

    /**
     * Store refresh token with expiration
     * @param {string} userId - User ID
     * @param {string} refreshToken - JWT refresh token
     * @param {number} expiresIn - Expiration time in seconds
     * @returns {Promise<string>} Token ID for tracking
     */
    async storeRefreshToken(userId, refreshToken, expiresIn = 7 * 24 * 60 * 60) {
        try {
            const client = this.getClient();
            const tokenId = crypto.randomUUID();
            const key = `${this.keyPrefixes.REFRESH_TOKEN}:${userId}:${tokenId}`;

            // Store token with metadata
            const tokenData = {
                token: refreshToken,
                userId,
                tokenId,
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            };

            await client.setEx(key, expiresIn, JSON.stringify(tokenData));

            // Create reverse mapping from refresh token to token data
            const tokenKey = `${this.keyPrefixes.REFRESH_TOKEN}:token:${refreshToken}`;
            await client.setEx(tokenKey, expiresIn, JSON.stringify({ tokenId, userId }));

            // Also add to user's active tokens set
            const userTokensKey = `${this.keyPrefixes.REFRESH_TOKEN}:${userId}:active`;
            await client.sAdd(userTokensKey, tokenId);
            await client.expire(userTokensKey, expiresIn);

            logger.info(`Refresh token stored for user ${userId}`, { tokenId });
            return tokenId;
        } catch (error) {
            logger.error('Failed to store refresh token:', error);
            throw new Error('Failed to store refresh token');
        }
    }

    /**
     * Validate and retrieve refresh token
     * @param {string} userId - User ID
     * @param {string} tokenId - Token ID
     * @returns {Promise<Object|null>} Token data or null
     */
    async validateRefreshToken(userId, tokenId) {
        try {
            const client = this.getClient();
            const key = `${this.keyPrefixes.REFRESH_TOKEN}:${userId}:${tokenId}`;

            const tokenDataStr = await client.get(key);
            if (!tokenDataStr) {
                return null;
            }

            const tokenData = JSON.parse(tokenDataStr);

            // Update last used timestamp
            tokenData.lastUsed = new Date().toISOString();
            const ttl = await client.ttl(key);
            if (ttl > 0) {
                await client.setEx(key, ttl, JSON.stringify(tokenData));
            }

            return tokenData;
        } catch (error) {
            logger.error('Failed to validate refresh token:', error);
            return null;
        }
    }

    /**
     * Validate refresh token by token value and return user data
     * @param {string} refreshToken - JWT refresh token string
     * @returns {Promise<Object|null>} Token data or null if invalid
     */
    async validateRefreshTokenByToken(refreshToken) {
        try {
            const client = this.getClient();
            const tokenKey = `${this.keyPrefixes.REFRESH_TOKEN}:token:${refreshToken}`;
            const tokenMappingStr = await client.get(tokenKey);

            if (!tokenMappingStr) {
                return null;
            }

            // Parse the token mapping to get tokenId and userId
            const tokenMapping = JSON.parse(tokenMappingStr);
            const { tokenId, userId } = tokenMapping;

            // Get the actual token data
            const key = `${this.keyPrefixes.REFRESH_TOKEN}:${userId}:${tokenId}`;
            const tokenDataStr = await client.get(key);

            if (!tokenDataStr) {
                return null;
            }

            const tokenData = JSON.parse(tokenDataStr);

            // Check if token has expired
            if (new Date() > new Date(tokenData.expiresAt)) {
                await this.revokeRefreshToken(tokenData.userId, tokenId);
                return null;
            }

            return tokenData;
        } catch (error) {
            logger.error('Failed to validate refresh token by token:', error);
            return null;
        }
    }

    /**
     * Revoke a specific refresh token
     * @param {string} userId - User ID
     * @param {string} tokenId - Token ID
     */
    async revokeRefreshToken(userId, tokenId) {
        try {
            const client = this.getClient();
            const key = `${this.keyPrefixes.REFRESH_TOKEN}:${userId}:${tokenId}`;

            // Get token data to find refresh token for cleanup
            const tokenDataStr = await client.get(key);
            if (tokenDataStr) {
                const tokenData = JSON.parse(tokenDataStr);
                const tokenKey = `${this.keyPrefixes.REFRESH_TOKEN}:token:${tokenData.token}`;
                await client.del(tokenKey);
            }

            await Promise.all([
                client.del(key),
                client.sRem(`${this.keyPrefixes.REFRESH_TOKEN}:${userId}:active`, tokenId)
            ]);

            logger.info(`Refresh token revoked for user ${userId}`, { tokenId });
        } catch (error) {
            logger.error('Failed to revoke refresh token:', error);
        }
    }

    /**
     * Revoke all refresh tokens for a user
     * @param {string} userId - User ID
     */
    async revokeAllRefreshTokens(userId) {
        try {
            const client = this.getClient();
            const userTokensKey = `${this.keyPrefixes.REFRESH_TOKEN}:${userId}:active`;

            // Get all active token IDs
            const tokenIds = await client.sMembers(userTokensKey);

            if (tokenIds.length > 0) {
                // Delete all token keys
                const tokenKeys = tokenIds.map(tokenId =>
                    `${this.keyPrefixes.REFRESH_TOKEN}:${userId}:${tokenId}`
                );
                await client.del([...tokenKeys, userTokensKey]);
            }

            logger.info(`All refresh tokens revoked for user ${userId}`, { count: tokenIds.length });
        } catch (error) {
            logger.error('Failed to revoke all refresh tokens:', error);
        }
    }

    // ============ RATE LIMITING ============

    /**
     * Check and increment rate limit counter
     * @param {string} identifier - IP address or user ID
     * @param {string} action - Action being rate limited
     * @param {number} limit - Max attempts allowed
     * @param {number} windowSeconds - Time window in seconds
     * @returns {Promise<Object>} Rate limit status
     */
    async checkRateLimit(identifier, action, limit = 5, windowSeconds = 900) {
        try {
            const client = this.getClient();
            const key = `${this.keyPrefixes.RATE_LIMIT}:${action}:${identifier}`;

            const current = await client.incr(key);

            // Set expiration on first increment
            if (current === 1) {
                await client.expire(key, windowSeconds);
            }

            const ttl = await client.ttl(key);
            const isAllowed = current <= limit;

            logger.debug(`Rate limit check for ${action}:${identifier}`, {
                current,
                limit,
                isAllowed,
                ttl
            });

            return {
                isAllowed,
                current,
                limit,
                resetTime: ttl > 0 ? Date.now() + (ttl * 1000) : null,
                retryAfter: ttl > 0 ? ttl : null
            };
        } catch (error) {
            logger.error('Rate limit check failed:', error);
            // Fail open - allow request if Redis is down
            return { isAllowed: true, current: 0, limit };
        }
    }

    /**
     * Reset rate limit for identifier and action
     * @param {string} identifier - IP address or user ID
     * @param {string} action - Action being rate limited
     */
    async resetRateLimit(identifier, action) {
        try {
            const client = this.getClient();
            const key = `${this.keyPrefixes.RATE_LIMIT}:${action}:${identifier}`;
            await client.del(key);

            logger.info(`Rate limit reset for ${action}:${identifier}`);
        } catch (error) {
            logger.error('Failed to reset rate limit:', error);
        }
    }

    // ============ SESSION MANAGEMENT ============

    /**
     * Store user session
     * @param {string} userId - User ID
     * @param {Object} sessionData - Session metadata
     * @param {number} expiresIn - Session expiration in seconds
     */
    async storeSession(userId, sessionData, expiresIn = 24 * 60 * 60) {
        try {
            const client = this.getClient();
            const sessionId = crypto.randomUUID();
            const key = `${this.keyPrefixes.SESSION}:${userId}:${sessionId}`;

            const session = {
                sessionId,
                userId,
                ...sessionData,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            };

            await client.setEx(key, expiresIn, JSON.stringify(session));

            // Add to user's active sessions
            const userSessionsKey = `${this.keyPrefixes.SESSION}:${userId}:active`;
            await client.sAdd(userSessionsKey, sessionId);
            await client.expire(userSessionsKey, expiresIn);

            logger.info(`Session stored for user ${userId}`, { sessionId });
            return sessionId;
        } catch (error) {
            logger.error('Failed to store session:', error);
            throw new Error('Failed to store session');
        }
    }

    /**
     * Get user session
     * @param {string} userId - User ID
     * @param {string} sessionId - Session ID
     */
    async getSession(userId, sessionId) {
        try {
            const client = this.getClient();
            const key = `${this.keyPrefixes.SESSION}:${userId}:${sessionId}`;

            const sessionDataStr = await client.get(key);
            if (!sessionDataStr) {
                return null;
            }

            const sessionData = JSON.parse(sessionDataStr);

            // Update last activity
            sessionData.lastActivity = new Date().toISOString();
            const ttl = await client.ttl(key);
            if (ttl > 0) {
                await client.setEx(key, ttl, JSON.stringify(sessionData));
            }

            return sessionData;
        } catch (error) {
            logger.error('Failed to get session:', error);
            return null;
        }
    }

    /**
     * End user session
     * @param {string} userId - User ID
     * @param {string} sessionId - Session ID
     */
    async endSession(userId, sessionId) {
        try {
            const client = this.getClient();
            const key = `${this.keyPrefixes.SESSION}:${userId}:${sessionId}`;

            await Promise.all([
                client.del(key),
                client.sRem(`${this.keyPrefixes.SESSION}:${userId}:active`, sessionId)
            ]);

            logger.info(`Session ended for user ${userId}`, { sessionId });
        } catch (error) {
            logger.error('Failed to end session:', error);
        }
    }

    // ============ CACHING ============

    /**
     * Cache data with expiration
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} expiresIn - Expiration in seconds
     */
    async setCache(key, data, expiresIn = 3600) {
        try {
            const client = this.getClient();
            await client.setEx(key, expiresIn, JSON.stringify(data));
        } catch (error) {
            logger.error('Failed to set cache:', error);
        }
    }

    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {Promise<any|null>} Cached data or null
     */
    async getCache(key) {
        try {
            const client = this.getClient();
            const data = await client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            logger.error('Failed to get cache:', error);
            return null;
        }
    }

    /**
     * Delete cached data
     * @param {string} key - Cache key
     */
    async deleteCache(key) {
        try {
            const client = this.getClient();
            await client.del(key);
        } catch (error) {
            logger.error('Failed to delete cache:', error);
        }
    }

    /**
     * Cache user profile
     * @param {string} userId - User ID
     * @param {Object} userData - User data
     * @param {number} expiresIn - Expiration in seconds
     */
    async cacheUser(userId, userData, expiresIn = 1800) {
        const key = `${this.keyPrefixes.USER_CACHE}:${userId}`;
        await this.setCache(key, userData, expiresIn);
    }

    /**
     * Get cached user profile
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User data or null
     */
    async getCachedUser(userId) {
        const key = `${this.keyPrefixes.USER_CACHE}:${userId}`;
        return await this.getCache(key);
    }

    /**
     * Invalidate user cache
     * @param {string} userId - User ID
     */
    async invalidateUserCache(userId) {
        const key = `${this.keyPrefixes.USER_CACHE}:${userId}`;
        await this.deleteCache(key);
    }

    // ============ TOKEN BLACKLISTING ============

    /**
     * Blacklist a JWT token
     * @param {string} token - Full JWT token or token ID to blacklist
     * @param {number} expiresIn - Token expiration time
     */
    async blacklistToken(token, expiresIn) {
        try {
            const client = this.getClient();
            let tokenId = token;

            // If it's a full JWT token, extract the jti
            if (token.includes('.')) {
                try {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.decode(token);
                    tokenId = decoded?.jti || token;
                } catch (e) {
                    // If JWT decode fails, use the token as-is
                    tokenId = token;
                }
            }

            const key = `${this.keyPrefixes.BLACKLIST}:${tokenId}`;
            await client.setEx(key, expiresIn, 'blacklisted');

            logger.info(`Token blacklisted`, { tokenId });
        } catch (error) {
            logger.error('Failed to blacklist token:', error);
        }
    }

    /**
     * Check if token is blacklisted
     * @param {string} token - Full JWT token or token ID to check
     * @returns {Promise<boolean>} True if blacklisted
     */
    async isTokenBlacklisted(token) {
        try {
            const client = this.getClient();
            let tokenId = token;

            // If it's a full JWT token, extract the jti
            if (token.includes('.')) {
                try {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.decode(token);
                    tokenId = decoded?.jti || token;
                } catch (e) {
                    // If JWT decode fails, use the token as-is
                    tokenId = token;
                }
            }

            const key = `${this.keyPrefixes.BLACKLIST}:${tokenId}`;
            const result = await client.get(key);
            return result !== null;
        } catch (error) {
            logger.error('Failed to check token blacklist:', error);
            return false;
        }
    }

    // ============ ANALYTICS CACHING ============

    /**
     * Cache analytics data
     * @param {string} cacheKey - Analytics cache key
     * @param {Object} analyticsData - Analytics results
     * @param {number} expiresIn - Cache expiration in seconds
     */
    async cacheAnalytics(cacheKey, analyticsData, expiresIn = 1800) {
        const key = `${this.keyPrefixes.ANALYTICS_CACHE}:${cacheKey}`;
        await this.setCache(key, analyticsData, expiresIn);
        logger.debug(`Analytics cached`, { cacheKey });
    }

    /**
     * Get cached analytics data
     * @param {string} cacheKey - Analytics cache key
     * @returns {Promise<Object|null>} Cached analytics or null
     */
    async getCachedAnalytics(cacheKey) {
        const key = `${this.keyPrefixes.ANALYTICS_CACHE}:${cacheKey}`;
        return await this.getCache(key);
    }

    /**
     * Invalidate analytics cache pattern
     * @param {string} pattern - Cache key pattern
     */
    async invalidateAnalyticsCache(pattern) {
        try {
            const client = this.getClient();
            const searchKey = `${this.keyPrefixes.ANALYTICS_CACHE}:${pattern}*`;
            const keys = await client.keys(searchKey);

            if (keys.length > 0) {
                await client.del(keys);
                logger.info(`Invalidated analytics cache`, { pattern, count: keys.length });
            }
        } catch (error) {
            logger.error('Failed to invalidate analytics cache:', error);
        }
    }

    /**
     * Flush all data from Redis (for testing)
     */
    async flushAll() {
        try {
            const client = this.getClient();
            await client.flushAll();
            logger.info('Flushed all Redis data');
        } catch (error) {
            logger.error('Failed to flush Redis:', error);
            throw error;
        }
    }

    /**
     * Close Redis connection
     */
    async close() {
        try {
            if (this.client && this.client.isOpen) {
                await this.client.quit();
                this.client = null;
                logger.info('Redis connection closed');
            }
        } catch (error) {
            logger.error('Error closing Redis connection:', error);
        }
    }

    /**
     * Check if Redis client is connected
     */
    isConnected() {
        return this.client && this.client.isOpen;
    }
}

// Create singleton instance
const redisService = new RedisService();

export { redisService };
