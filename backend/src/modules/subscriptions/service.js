class SubscriptionService {
    constructor(logger, database) {
        this.logger = logger;
        this.database = database;
    }

    async getSubscription(centerId) {
        this.logger.info(`Getting subscription for center: ${centerId}`);
        return await this.database.subscriptions.findOne({ centerId });
    }

    async validateLimits(centerId, action) {
        this.logger.info(`Validating limits for center ${centerId}, action: ${action}`);
        const subscription = await this.getSubscription(centerId);

        if (!subscription) {
            throw new Error('No subscription found');
        }

        switch (action) {
            case 'createTest':
                return this.validateTestCreation(subscription);
            case 'addStudent':
                return this.validateStudentAddition(subscription);
            // Add other limit validations
            default:
                throw new Error('Unknown action type');
        }
    }

    async createSubscription(subscriptionData) {
        this.logger.info('Creating new subscription');
        return await this.database.subscriptions.create(subscriptionData);
    }

    async updateSubscription(centerId, updateData) {
        this.logger.info(`Updating subscription for center: ${centerId}`);
        return await this.database.subscriptions.findOneAndUpdate(
            { centerId },
            updateData,
            { new: true }
        );
    }

    async validateTestCreation(subscription) {
        const currentTests = await this.database.tests.countDocuments({
            centerId: subscription.centerId
        });
        if (currentTests >= subscription.maxTests) {
            throw new Error('Test creation limit reached');
        }
        return true;
    }

    async validateStudentAddition(subscription) {
        const currentStudents = await this.database.users.countDocuments({
            centerId: subscription.centerId,
            role: 'student'
        });
        if (currentStudents >= subscription.maxStudents) {
            throw new Error('Student limit reached');
        }
        return true;
    }
}

module.exports = { SubscriptionService };
