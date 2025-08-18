import { subscriptionService } from './service.js';
import { logger } from "../../config/logger.js";

class SubscriptionController {
    constructor() {
        this.subscriptionService = subscriptionService;
    }

    // Get current subscription details
    getSubscription = async (req, res) => {
        try {
            logger.info('Get subscription endpoint called');
            const userId = req.user.id;

            const subscription = await this.subscriptionService.getSubscription(userId);

            res.json({
                success: true,
                data: subscription
            });
        } catch (error) {
            logger.error('Get subscription failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get subscription'
            });
        }
    };

    // Get subscription by center ID (for admin access)
    getSubscriptionByCenter = async (req, res) => {
        try {
            logger.info('Get subscription by center endpoint called');
            const { centerId } = req.params;

            // Verify user has permission to access this center's subscription
            if (req.user.role !== 'test_center_owner' || req.user.id !== centerId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const subscription = await this.subscriptionService.getSubscription(centerId);

            res.json({
                success: true,
                data: subscription
            });
        } catch (error) {
            logger.error('Get subscription by center failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get subscription'
            });
        }
    };

    // Get available subscription tiers
    getAvailableTiers = async (req, res) => {
        try {
            logger.info('Get available tiers endpoint called');

            const tiers = this.subscriptionService.getAvailableTiers();

            res.json({
                success: true,
                data: {
                    tiers,
                    currentTier: req.user.subscriptionTier
                }
            });
        } catch (error) {
            logger.error('Get available tiers failed:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get available tiers'
            });
        }
    };

    // Upgrade subscription
    upgradeSubscription = async (req, res) => {
        try {
            logger.info('Upgrade subscription endpoint called');
            const userId = req.user.id;
            const { tier, paymentDetails } = req.body;

            if (!tier) {
                return res.status(400).json({
                    success: false,
                    message: 'Subscription tier is required'
                });
            }

            const result = await this.subscriptionService.upgradeSubscription(
                userId,
                tier,
                paymentDetails
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Upgrade subscription failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to upgrade subscription'
            });
        }
    };

    // Downgrade subscription
    downgradeSubscription = async (req, res) => {
        try {
            logger.info('Downgrade subscription endpoint called');
            const userId = req.user.id;
            const { tier, reason } = req.body;

            if (!tier) {
                return res.status(400).json({
                    success: false,
                    message: 'Subscription tier is required'
                });
            }

            const result = await this.subscriptionService.downgradeSubscription(
                userId,
                tier,
                reason
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Downgrade subscription failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to downgrade subscription'
            });
        }
    };

    // Get subscription limits for current user
    getSubscriptionLimits = async (req, res) => {
        try {
            logger.info('Get subscription limits endpoint called');
            const userTier = req.user.subscriptionTier;

            const limits = this.subscriptionService.getSubscriptionLimits(userTier);

            if (!limits) {
                return res.status(404).json({
                    success: false,
                    message: 'Subscription tier not found'
                });
            }

            res.json({
                success: true,
                data: {
                    tier: userTier,
                    limits,
                    currentLimits: req.user.subscriptionLimits
                }
            });
        } catch (error) {
            logger.error('Get subscription limits failed:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get subscription limits'
            });
        }
    };

    // Validate a specific action against subscription limits
    validateSubscriptionAction = async (req, res) => {
        try {
            logger.info('Validate subscription action endpoint called');
            const userId = req.user.id;
            const { action, metadata } = req.body;

            if (!action) {
                return res.status(400).json({
                    success: false,
                    message: 'Action is required'
                });
            }

            const validation = await this.subscriptionService.validateAction(
                userId,
                action,
                metadata || {}
            );

            res.json({
                success: true,
                data: validation
            });
        } catch (error) {
            logger.error('Validate subscription action failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to validate action'
            });
        }
    };

    // Get usage statistics
    getUsageStats = async (req, res) => {
        try {
            logger.info('Get usage stats endpoint called');
            const userId = req.user.id;

            // For test center owners, get their own stats
            // For test creators/students, get their test center owner's stats
            const ownerId = req.user.role === 'test_center_owner'
                ? userId
                : null;

            if (!ownerId) {
                return res.status(400).json({
                    success: false,
                    message: 'You not a test center owner'
                });
            }

            const usage = await this.subscriptionService.getUsageStats(ownerId);

            res.json({
                success: true,
                data: usage
            });
        } catch (error) {
            logger.error('Get usage stats failed:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get usage statistics'
            });
        }
    };

    // Cancel subscription (downgrade to free)
    cancelSubscription = async (req, res) => {
        try {
            logger.info('Cancel subscription endpoint called');
            const userId = req.user.id;
            const { reason } = req.body;

            const result = await this.subscriptionService.downgradeSubscription(
                userId,
                'free',
                reason || 'User cancelled subscription'
            );

            res.json({
                success: true,
                data: result,
                message: 'Subscription cancelled successfully'
            });
        } catch (error) {
            logger.error('Cancel subscription failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to cancel subscription'
            });
        }
    };

    // Renew subscription (extend expiry date)
    renewSubscription = async (req, res) => {
        try {
            logger.info('Renew subscription endpoint called');
            const userId = req.user.id;
            const { paymentDetails } = req.body;

            // Renew by upgrading to the same tier (which extends expiry)
            const currentTier = req.user.subscriptionTier;

            const result = await this.subscriptionService.upgradeSubscription(
                userId,
                currentTier,
                paymentDetails
            );

            res.json({
                success: true,
                data: result,
                message: 'Subscription renewed successfully'
            });
        } catch (error) {
            logger.error('Renew subscription failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to renew subscription'
            });
        }
    };
}



const subscriptionController = new SubscriptionController();

export { subscriptionController };