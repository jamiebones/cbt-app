import { createClient } from 'redis';
import { logger } from './logger.js';

let redisClient = null;

const connectRedis = async () => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const redisPassword = process.env.REDIS_PASSWORD;

        logger.info(`Attempting to connect to Redis at: ${redisUrl}`);
        if (redisPassword) {
            logger.info('Redis password provided - using authentication');
        } else {
            logger.info('No Redis password provided - connecting without auth');
        }

        const clientOptions = {
            url: redisUrl,
            socket: {
                connectTimeout: 5000,
                lazyConnect: true,
            },
            retry_strategy: (options) => {
                if (options.error && options.error.code === 'ECONNREFUSED') {
                    logger.error('Redis server connection refused');
                    return new Error('Redis server connection refused');
                }
                if (options.total_retry_time > 1000 * 60 * 60) {
                    logger.error('Redis retry time exhausted');
                    return new Error('Retry time exhausted');
                }
                if (options.attempt > 10) {
                    logger.error('Redis max retry attempts reached');
                    return undefined;
                }
                // Reconnect after
                return Math.min(options.attempt * 100, 3000);
            }
        };

        if (redisPassword) {
            clientOptions.password = redisPassword;
        }

        redisClient = createClient(clientOptions);

        redisClient.on('error', (error) => {
            logger.error('Redis client error:', error);
        });

        redisClient.on('connect', () => {
            logger.info('Redis client connected');
        });

        redisClient.on('ready', () => {
            logger.info('Redis client ready');
        });

        redisClient.on('end', () => {
            logger.warn('Redis client connection ended');
        });

        redisClient.on('reconnecting', () => {
            logger.info('Redis client reconnecting');
        });

        await redisClient.connect();

        // Test the connection
        await redisClient.ping();
        logger.info(`Redis connected successfully to: ${redisUrl}`);

    } catch (error) {
        logger.error('Redis connection failed:', error);
        throw error;
    }
};

const getRedisClient = () => {
    if (!redisClient) {
        throw new Error('Redis client not initialized. Call connectRedis() first.');
    }
    return redisClient;
};

const disconnectRedis = async () => {
    try {
        if (redisClient) {
            await redisClient.quit();
            redisClient = null;
            logger.info('Redis connection closed');
        }
    } catch (error) {
        logger.error('Error closing Redis connection:', error);
        throw error;
    }
};

export {
    connectRedis,
    getRedisClient,
    disconnectRedis
};