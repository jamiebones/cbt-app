import mongoose from 'mongoose';
import { logger } from './logger.js';

class DatabaseConnection {
    constructor() {
        this.isConnected = false;
        this.reconnectRetries = 0;
        this.maxReconnectRetries = 5;
        this.reconnectInterval = 5000; // 5 seconds
        this.reconnectTimeoutId = null; // Store timeout ID for cleanup
    }

    async connect() {
        try {
            // Database configuration
            const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/cbt_app';
            const nodeEnv = process.env.NODE_ENV || 'development';

            logger.info(`Connecting to MongoDB in ${nodeEnv} mode...`);
            logger.debug(`MongoDB URL: ${this.maskPassword(mongoUrl)}`);

            const options = {
                // Connection pool settings
                maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '10'),
                minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '2'),

                // Timeout settings
                serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '5000'),
                socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000'),
                connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT || '10000'),

                // Heartbeat settings
                heartbeatFrequencyMS: parseInt(process.env.MONGO_HEARTBEAT_FREQUENCY || '10000'),

                // Buffer settings
                bufferCommands: false,

                // Write concern (for production reliability)
                writeConcern: {
                    w: nodeEnv === 'production' ? 'majority' : 1,
                    j: nodeEnv === 'production' // Journal writes in production
                },

                // Read preference
                readPreference: 'primary',

                // Index builds
                autoIndex: nodeEnv !== 'production' // Disable in production for performance
            };

            // Add authentication if credentials are provided
            if (process.env.MONGO_USERNAME && process.env.MONGO_PASSWORD) {
                options.auth = {
                    username: process.env.MONGO_USERNAME,
                    password: process.env.MONGO_PASSWORD
                };
                options.authSource = process.env.MONGO_AUTH_SOURCE || 'admin';
            }

            // Connect to MongoDB
            await mongoose.connect(mongoUrl, options);

            this.isConnected = true;
            this.reconnectRetries = 0;

            logger.info(`✅ MongoDB connected successfully`);
            logger.info(`Database: ${mongoose.connection.db.databaseName}`);
            logger.info(`Host: ${mongoose.connection.host}:${mongoose.connection.port}`);

            // Set up connection event handlers
            this.setupEventHandlers();

            // Set up mongoose debugging in development
            if (nodeEnv === 'development') {
                mongoose.set('debug', (collectionName, method, query, doc) => {
                    logger.debug(`MongoDB Query: ${collectionName}.${method}`, {
                        query: JSON.stringify(query),
                        doc: doc ? JSON.stringify(doc) : undefined
                    });
                });
            }

            return mongoose.connection;

        } catch (error) {
            this.isConnected = false;
            logger.error('❌ MongoDB connection failed:', error.message);

            // Log specific connection errors
            if (error.name === 'MongooseServerSelectionError') {
                logger.error('Server selection failed. Check if MongoDB is running and accessible.');
            } else if (error.name === 'MongooseTimeoutError') {
                logger.error('Connection timeout. Check network connectivity.');
            } else if (error.code === 18) {
                logger.error('Authentication failed. Check credentials.');
            }

            throw error;
        }
    }

    setupEventHandlers() {
        const connection = mongoose.connection;
        // Connection established
        connection.on('connected', () => {
            this.isConnected = true;
            logger.info('🔗 MongoDB connection established');
        });

        // Connection error
        connection.on('error', (error) => {
            this.isConnected = false;
            logger.error('💥 MongoDB connection error:', error.message);

            // Attempt reconnection for certain errors
            if (this.shouldReconnect(error)) {
                this.attemptReconnect();
            }
        });

        // Connection lost
        connection.on('disconnected', () => {
            this.isConnected = false;
            logger.warn('🔌 MongoDB disconnected');

            // Attempt reconnection
            if (this.reconnectRetries < this.maxReconnectRetries) {
                this.attemptReconnect();
            } else {
                logger.error('❌ Max reconnection attempts reached. Manual intervention required.');
            }
        });

        // Connection restored
        connection.on('reconnected', () => {
            this.isConnected = true;
            this.reconnectRetries = 0;
            // Clear any pending reconnection timeout
            if (this.reconnectTimeoutId) {
                clearTimeout(this.reconnectTimeoutId);
                this.reconnectTimeoutId = null;
            }
            logger.info('🔄 MongoDB reconnected successfully');
        });

        // Graceful shutdown handlers
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
        process.on('SIGUSR2', () => this.gracefulShutdown('SIGUSR2')); // nodemon restart
    }

    shouldReconnect(error) {
        // Reconnect for network errors, but not for authentication errors
        const reconnectableErrors = [
            'MongooseServerSelectionError',
            'MongooseTimeoutError',
            'MongoNetworkError'
        ];

        return reconnectableErrors.includes(error.name) ||
            (error.code && [11000, 11001, 13436].includes(error.code));
    }

    async attemptReconnect() {
        if (this.reconnectRetries >= this.maxReconnectRetries) {
            logger.error('❌ Max reconnection attempts exceeded');
            return;
        }

        this.reconnectRetries++;
        const delay = this.reconnectInterval * this.reconnectRetries; // Exponential backoff

        logger.info(`🔄 Attempting to reconnect to MongoDB (${this.reconnectRetries}/${this.maxReconnectRetries}) in ${delay}ms...`);

        // Clear any existing timeout before setting a new one
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
        }

        this.reconnectTimeoutId = setTimeout(async () => {
            try {
                if (mongoose.connection.readyState === 0) { // Disconnected
                    await mongoose.connect();
                }
            } catch (error) {
                logger.error('Reconnection attempt failed:', error.message);
            } finally {
                // Clear the timeout ID after execution
                this.reconnectTimeoutId = null;
            }
        }, delay);
    }

    async disconnect() {
        try {
            // Clear any pending reconnection timeout
            if (this.reconnectTimeoutId) {
                clearTimeout(this.reconnectTimeoutId);
                this.reconnectTimeoutId = null;
            }

            if (this.isConnected) {
                await mongoose.connection.close();
                this.isConnected = false;
                logger.info('🔐 MongoDB connection closed gracefully');
            }
        } catch (error) {
            logger.error('Error closing MongoDB connection:', error.message);
            throw error;
        }
    }

    async gracefulShutdown(signal) {
        logger.info(`📋 Received ${signal}. Closing MongoDB connection...`);
        try {
            await this.disconnect();
            logger.info('✅ MongoDB connection closed. Exiting process.');
            process.exit(0);
        } catch (error) {
            logger.error('❌ Error during graceful shutdown:', error.message);
            process.exit(1);
        }
    }

    // Utility methods
    getConnectionState() {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        return states[mongoose.connection.readyState] || 'unknown';
    }

    isHealthy() {
        return this.isConnected && mongoose.connection.readyState === 1;
    }

    getConnectionInfo() {
        if (!this.isConnected) {
            return { status: 'disconnected' };
        }

        return {
            status: 'connected',
            database: mongoose.connection.db?.databaseName,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            readyState: this.getConnectionState(),
            collections: Object.keys(mongoose.connection.collections).length
        };
    }

    maskPassword(url) {
        // Mask password in connection string for logging
        return url.replace(/:([^:@]+)@/, ':***@');
    }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

// Export convenience functions for backward compatibility
const connectDatabase = () => dbConnection.connect();
const disconnectDatabase = () => dbConnection.disconnect();

export {
    connectDatabase,
    disconnectDatabase,
    dbConnection
};

export default dbConnection;