const mongoose = require('mongoose');
const { getRedisClient } = require('../../config/redis');
const { logger } = require('../../config/logger');

class HealthController {
    // Basic health check
    basicHealth = async (req, res) => {
        res.status(200).json({
            success: true,
            message: 'CBT Backend Server is running',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0'
        });
    };

    // Detailed health check with dependencies
    detailedHealth = async (req, res) => {
        const health = {
            success: true,
            message: 'CBT Backend Server Health Check',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            dependencies: {
                mongodb: await this.checkMongoDB(),
                redis: await this.checkRedis()
            }
        };

        // Check if any dependency is unhealthy
        const isHealthy = Object.values(health.dependencies).every(dep => dep.status === 'healthy');

        if (!isHealthy) {
            health.success = false;
            health.message = 'Some dependencies are unhealthy';
        }

        const statusCode = isHealthy ? 200 : 503;
        res.status(statusCode).json(health);
    };

    // Readiness check - can the service handle requests?
    readinessCheck = async (req, res) => {
        try {
            const mongoHealth = await this.checkMongoDB();
            const redisHealth = await this.checkRedis();

            const isReady = mongoHealth.status === 'healthy' && redisHealth.status === 'healthy';

            if (isReady) {
                res.status(200).json({
                    success: true,
                    message: 'Service is ready',
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(503).json({
                    success: false,
                    message: 'Service is not ready',
                    timestamp: new Date().toISOString(),
                    dependencies: { mongodb: mongoHealth, redis: redisHealth }
                });
            }
        } catch (error) {
            logger.error('Readiness check failed:', error);
            res.status(503).json({
                success: false,
                message: 'Readiness check failed',
                timestamp: new Date().toISOString()
            });
        }
    };

    // Liveness check - is the service alive?
    livenessCheck = async (req, res) => {
        res.status(200).json({
            success: true,
            message: 'Service is alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    };

    // Check MongoDB connection
    checkMongoDB = async () => {
        try {
            const state = mongoose.connection.readyState;
            const states = {
                0: 'disconnected',
                1: 'connected',
                2: 'connecting',
                3: 'disconnecting'
            };

            if (state === 1) {
                // Test with a simple operation
                await mongoose.connection.db.admin().ping();
                return {
                    status: 'healthy',
                    state: states[state],
                    message: 'MongoDB connection is healthy'
                };
            } else {
                return {
                    status: 'unhealthy',
                    state: states[state],
                    message: `MongoDB connection state: ${states[state]}`
                };
            }
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `MongoDB health check failed: ${error.message}`
            };
        }
    };

    // Check Redis connection
    checkRedis = async () => {
        try {
            const redisClient = getRedisClient();
            const pong = await redisClient.ping();

            if (pong === 'PONG') {
                return {
                    status: 'healthy',
                    message: 'Redis connection is healthy'
                };
            } else {
                return {
                    status: 'unhealthy',
                    message: 'Redis ping failed'
                };
            }
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Redis health check failed: ${error.message}`
            };
        }
    };
}

const healthController = new HealthController();

module.exports = { healthController };