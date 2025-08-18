import { User } from '../../models/index.js';
import { logger } from '../../config/logger.js';

class UserService {
    async findById(id) {
        logger.debug(`Finding user by id: ${id}`);
        try {
            return await User.findById(id);
        } catch (error) {
            logger.error('Error finding user by id:', error.message);
            throw error;
        }
    }

    async findByEmail(email) {
        logger.debug(`Finding user by email: ${email}`);
        try {
            return await User.findByEmail(email);
        } catch (error) {
            logger.error('Error finding user by email:', error.message);
            throw error;
        }
    }

    async findByStudentId(studentId) {
        logger.debug(`Finding user by student ID: ${studentId}`);
        try {
            return await User.findOne({ studentId });
        } catch (error) {
            logger.error('Error finding user by student ID:', error.message);
            throw error;
        }
    }

    async create(userData) {
        logger.info('Creating new user', { email: userData.email, role: userData.role });
        try {
            const user = new User(userData);
            return await user.save();
        } catch (error) {
            logger.error('Error creating user:', error.message);
            throw error;
        }
    }

    async update(id, updateData) {
        logger.info(`Updating user: ${id}`);
        try {
            return await User.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true
            });
        } catch (error) {
            logger.error('Error updating user:', error.message);
            throw error;
        }
    }

    async delete(id) {
        logger.info(`Deleting user: ${id}`);
        try {
            return await User.findByIdAndDelete(id);
        } catch (error) {
            logger.error('Error deleting user:', error.message);
            throw error;
        }
    }

    async listUsers(filters = {}, options = {}) {
        logger.debug('Listing users with filters:', filters);
        try {
            const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
            const skip = (page - 1) * limit;

            const users = await User.find(filters)
                .sort(sort)
                .skip(skip)
                .limit(limit);

            const total = await User.countDocuments(filters);

            return {
                users,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total
                }
            };
        } catch (error) {
            logger.error('Error listing users:', error.message);
            throw error;
        }
    }

    async findTestCenterOwners() {
        logger.debug('Finding all test center owners');
        try {
            return await User.findTestCenterOwners();
        } catch (error) {
            logger.error('Error finding test center owners:', error.message);
            throw error;
        }
    }

    async findStudentsByOwner(ownerId) {
        logger.debug(`Finding students by owner: ${ownerId}`);
        try {
            return await User.findStudentsByOwner(ownerId);
        } catch (error) {
            logger.error('Error finding students by owner:', error.message);
            throw error;
        }
    }

    async updateSubscription(userId, subscriptionData) {
        logger.info(`Updating subscription for user: ${userId}`);
        try {
            return await User.findByIdAndUpdate(
                userId,
                {
                    subscriptionTier: subscriptionData.tier,
                    subscriptionExpiry: subscriptionData.expiry,
                    subscriptionLimits: subscriptionData.limits
                },
                { new: true, runValidators: true }
            );
        } catch (error) {
            logger.error('Error updating subscription:', error.message);
            throw error;
        }
    }

    async getSubscriptionStats() {
        logger.debug('Getting subscription statistics');
        try {
            return await User.getSubscriptionStats();
        } catch (error) {
            logger.error('Error getting subscription stats:', error.message);
            throw error;
        }
    }

    async getUserCount(filters = {}) {
        logger.debug('Getting user count with filters:', filters);
        try {
            return await User.countDocuments(filters);
        } catch (error) {
            logger.error('Error getting user count:', error.message);
            throw error;
        }
    }
}

// Export singleton instance
export const userService = new UserService();
export default userService;