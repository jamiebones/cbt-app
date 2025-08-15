import mongoose from 'mongoose';
import { logger } from './logger.js';

const connectDatabase = async () => {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/cbt_app';

        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
            bufferMaxEntries: 0,
        };

        await mongoose.connect(mongoUrl, options);

        logger.info(`MongoDB connected successfully to: ${mongoUrl}`);

        // Handle connection events
        mongoose.connection.on('error', (error) => {
            logger.error('MongoDB connection error:', error);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

    } catch (error) {
        logger.error('MongoDB connection failed:', error);
        throw error;
    }
};

const disconnectDatabase = async () => {
    try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
    } catch (error) {
        logger.error('Error closing MongoDB connection:', error);
        throw error;
    }
};

export {
    connectDatabase,
    disconnectDatabase
};