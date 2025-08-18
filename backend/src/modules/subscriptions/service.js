import { User } from '../../models/index.js';
import { logger } from '../../config/logger.js';

class SubscriptionService {
    constructor() {
        // Subscription tier configurations
        this.SUBSCRIPTION_TIERS = {
            free: {
                maxTests: 5,
                maxStudentsPerTest: 50,
                maxQuestionsPerTest: 50,
                canImportExcel: true,
                canUseAnalytics: true,
                maxStorageGB: 1,
                supportLevel: 'community',
            },
            premium: {
                maxTests: -1, // Unlimited
                maxStudentsPerTest: -1, // Unlimited
                maxQuestionsPerTest: -1, // Unlimited
                canImportExcel: true,
                canUseAnalytics: true,
                maxStorageGB: 50,
                supportLevel: 'priority',
            }
        };
    }

    // Get subscription details for a test center owner
    async getSubscription(userId) {
        logger.info(`Getting subscription for user: ${userId}`);

        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (user.role !== 'test_center_owner') {
                throw new Error('Only test center owners have subscriptions');
            }

            const subscriptionData = {
                userId: user._id,
                testCenterName: user.testCenterName,
                tier: user.subscriptionTier,
                limits: user.subscriptionLimits,
                tierConfig: this.SUBSCRIPTION_TIERS[user.subscriptionTier],
                usage: await this.getUsageStats(userId)
            };

            return subscriptionData;
        } catch (error) {
            logger.error('Failed to get subscription:', error);
            throw error;
        }
    }

    // Get current usage statistics
    async getUsageStats(ownerId) {
        logger.info(`Getting usage stats for owner: ${ownerId}`);

        try {
            // Run all counting operations in parallel for better performance
            const [
                testCount,
                studentCount,
                creatorCount,
                questionCount,
                storageUsedGB
            ] = await Promise.all([
                this.countUserTests(ownerId),
                this.countStudents(ownerId),
                this.countTestCreators(ownerId),
                this.countQuestions(ownerId),
                this.calculateStorageUsage(ownerId)
            ]);

            return {
                tests: testCount,
                students: studentCount,
                testCreators: creatorCount,
                questions: questionCount,
                storageUsedGB: storageUsedGB,
                lastUpdated: new Date()
            };
        } catch (error) {
            logger.error('Failed to get usage stats:', error);
            throw error;
        }
    }

    // Validate if an action is allowed based on subscription limits
    async validateAction(userId, action, metadata = {}) {
        logger.info(`Validating action '${action}' for user: ${userId}`);

        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get the owner's ID (could be the user themselves or their test center owner)
            const ownerId = user.role === 'test_center_owner' ? user._id : user.testCenterOwner;
            const owner = await User.findById(ownerId);

            if (!owner) {
                throw new Error('Test center owner not found');
            }

            const limits = owner.subscriptionLimits;
            const usage = await this.getUsageStats(ownerId);

            switch (action) {
                case 'createTest':
                    return this.validateTestCreation(limits, usage);

                case 'addStudent':
                    return this.validateStudentAddition(limits, usage);

                case 'addQuestionToTest':
                    return this.validateQuestionAddition(limits, usage, metadata);

                case 'importExcel':
                    return this.validateExcelImport(limits);

                case 'useAnalytics':
                    return this.validateAnalyticsAccess(limits);

                case 'uploadMedia':
                    return this.validateMediaUpload(limits, usage, metadata);

                default:
                    logger.warn(`Unknown action type: ${action}`);
                    return { allowed: true, message: 'No limits defined for this action' };
            }
        } catch (error) {
            logger.error('Failed to validate action:', error);
            throw error;
        }
    }

    // Upgrade subscription tier
    async upgradeSubscription(userId, newTier, paymentDetails = null) {
        logger.info(`Upgrading subscription for user ${userId} to ${newTier}`);

        try {
            const user = await User.findById(userId);
            if (!user || user.role !== 'test_center_owner') {
                throw new Error('Only test center owners can upgrade subscriptions');
            }

            if (!this.SUBSCRIPTION_TIERS[newTier]) {
                throw new Error('Invalid subscription tier');
            }

            // For premium upgrade, you would typically validate payment here
            if (newTier === 'premium' && !paymentDetails) {
                throw new Error('Payment details required for premium subscription');
            }

            // Update user subscription
            user.subscriptionTier = newTier;
            user.subscriptionExpiry = this.calculateExpiryDate(newTier);

            // Update limits based on new tier
            user.subscriptionLimits = { ...this.SUBSCRIPTION_TIERS[newTier] };
            delete user.subscriptionLimits.price; // Don't store price in user record

            await user.save();

            logger.info(`Successfully upgraded user ${userId} to ${newTier}`);

            return {
                success: true,
                message: `Successfully upgraded to ${newTier} plan`,
                subscription: await this.getSubscription(userId),
                upgradedAt: new Date()
            };
        } catch (error) {
            logger.error('Failed to upgrade subscription:', error);
            throw error;
        }
    }

    // Downgrade subscription tier
    async downgradeSubscription(userId, newTier, reason = null) {
        logger.info(`Downgrading subscription for user ${userId} to ${newTier}`);

        try {
            const user = await User.findById(userId);
            if (!user || user.role !== 'test_center_owner') {
                throw new Error('Only test center owners can modify subscriptions');
            }

            if (!this.SUBSCRIPTION_TIERS[newTier]) {
                throw new Error('Invalid subscription tier');
            }

            // Check if downgrade would violate current usage
            const usage = await this.getUsageStats(userId);
            const newLimits = this.SUBSCRIPTION_TIERS[newTier];

            const violations = this.checkDowngradeViolations(usage, newLimits);
            if (violations.length > 0) {
                throw new Error(`Cannot downgrade: ${violations.join(', ')}`);
            }

            // Update user subscription
            user.subscriptionTier = newTier;
            user.subscriptionLimits = { ...newLimits };
            delete user.subscriptionLimits.price;

            await user.save();

            logger.info(`Successfully downgraded user ${userId} to ${newTier}`);

            return {
                success: true,
                message: `Successfully downgraded to ${newTier} plan`,
                subscription: await this.getSubscription(userId),
                downgradedAt: new Date(),
                reason: reason
            };
        } catch (error) {
            logger.error('Failed to downgrade subscription:', error);
            throw error;
        }
    }

    // Get subscription limits for a specific tier
    getSubscriptionLimits(tier) {
        return this.SUBSCRIPTION_TIERS[tier] || null;
    }

    // Get all available subscription tiers
    getAvailableTiers() {
        return Object.keys(this.SUBSCRIPTION_TIERS).map(tier => ({
            tier,
            ...this.SUBSCRIPTION_TIERS[tier]
        }));
    }

    // Private helper methods
    async countUserTests(ownerId) {
        try {
            const { Test } = await import('../../models/index.js');
            return await Test.countDocuments({
                testCenterOwner: ownerId,
                status: { $ne: 'archived' }
            });
        } catch (error) {
            logger.error('Failed to count tests:', error);
            return 0;
        }
    }

    async countStudents(ownerId) {
        return await User.countDocuments({
            testCenterOwner: ownerId,
            role: 'student'
        });
    }

    async countTestCreators(ownerId) {
        return await User.countDocuments({
            testCenterOwner: ownerId,
            role: 'test_creator'
        });
    }

    async countQuestions(ownerId) {
        try {
            const { Question } = await import('../../models/index.js');
            return await Question.countDocuments({
                testCenterOwner: ownerId,
                isActive: true
            });
        } catch (error) {
            logger.error('Failed to count questions:', error);
            return 0;
        }
    }

    async calculateStorageUsage(ownerId) {
        // This would calculate actual file storage usage (to be implemented)
        return 0.1; // Placeholder: 0.1 GB
    }

    validateTestCreation(limits, usage) {
        if (limits.maxTests !== -1 && usage.tests >= limits.maxTests) {
            return {
                allowed: false,
                message: `Test limit reached (${limits.maxTests}). Upgrade to premium for unlimited tests.`,
                currentUsage: usage.tests,
                limit: limits.maxTests
            };
        }
        return { allowed: true, message: 'Test creation allowed' };
    }

    validateStudentAddition(limits, usage) {
        if (limits.maxStudentsPerTest !== -1 && usage.students >= limits.maxStudentsPerTest) {
            return {
                allowed: false,
                message: `Student limit reached (${limits.maxStudentsPerTest}). Upgrade to premium for unlimited students.`,
                currentUsage: usage.students,
                limit: limits.maxStudentsPerTest
            };
        }
        return { allowed: true, message: 'Student addition allowed' };
    }

    validateQuestionAddition(limits, usage, metadata) {
        const testQuestionCount = metadata.currentQuestionsInTest || 0;
        if (limits.maxQuestionsPerTest !== -1 && testQuestionCount >= limits.maxQuestionsPerTest) {
            return {
                allowed: false,
                message: `Question limit reached (${limits.maxQuestionsPerTest}) for this test. Upgrade to premium for unlimited questions.`,
                currentUsage: testQuestionCount,
                limit: limits.maxQuestionsPerTest
            };
        }
        return { allowed: true, message: 'Question addition allowed' };
    }

    validateExcelImport(limits) {
        if (!limits.canImportExcel) {
            return {
                allowed: false,
                message: 'Excel import not available on free plan. Upgrade to premium to import questions from Excel.'
            };
        }
        return { allowed: true, message: 'Excel import allowed' };
    }

    validateAnalyticsAccess(limits) {
        if (!limits.canUseAnalytics) {
            return {
                allowed: false,
                message: 'Analytics not available on free plan. Upgrade to premium to access detailed analytics.'
            };
        }
        return { allowed: true, message: 'Analytics access allowed' };
    }

    validateMediaUpload(limits, usage, metadata) {
        const fileSizeGB = (metadata.fileSizeBytes || 0) / (1024 * 1024 * 1024);
        const newTotalUsage = usage.storageUsedGB + fileSizeGB;

        if (newTotalUsage > limits.maxStorageGB) {
            return {
                allowed: false,
                message: `Storage limit exceeded. Current: ${usage.storageUsedGB.toFixed(2)}GB, Limit: ${limits.maxStorageGB}GB`,
                currentUsage: usage.storageUsedGB,
                limit: limits.maxStorageGB
            };
        }
        return { allowed: true, message: 'Media upload allowed' };
    }

    calculateExpiryDate(tier) {
        const now = new Date();
        if (tier === 'free') {
            // Free tier gets 30 day trial
            return new Date(now.getTime() + (this.TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000));
        } else {
            // Premium tier gets 30 days from payment
            return new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        }
    }

    checkDowngradeViolations(usage, newLimits) {
        const violations = [];

        if (newLimits.maxTests !== -1 && usage.tests > newLimits.maxTests) {
            violations.push(`Too many tests (${usage.tests}/${newLimits.maxTests})`);
        }

        if (newLimits.maxStudentsPerTest !== -1 && usage.students > newLimits.maxStudentsPerTest) {
            violations.push(`Too many students (${usage.students}/${newLimits.maxStudentsPerTest})`);
        }

        if (usage.storageUsedGB > newLimits.maxStorageGB) {
            violations.push(`Storage usage too high (${usage.storageUsedGB.toFixed(2)}GB/${newLimits.maxStorageGB}GB)`);
        }

        return violations;
    }
}

// Create singleton instance
const subscriptionService = new SubscriptionService();

export { subscriptionService };
