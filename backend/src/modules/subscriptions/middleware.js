import { subscriptionService } from './service.js';
import { logger } from '../../config/logger.js';

// Middleware to check if user's subscription allows a specific action
const requireSubscription = (action, metadata = {}) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;

            // Add any request-specific metadata
            const actionMetadata = {
                ...metadata,
                ...req.body.metadata // Allow frontend to pass additional metadata
            };

            const validation = await subscriptionService.validateAction(
                userId,
                action,
                actionMetadata
            );

            if (!validation.allowed) {
                return res.status(403).json({
                    success: false,
                    message: validation.message,
                    code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
                    data: {
                        action,
                        currentUsage: validation.currentUsage,
                        limit: validation.limit,
                        tier: req.user.subscriptionTier
                    }
                });
            }

            // Action is allowed, continue to next middleware
            next();
        } catch (error) {
            logger.error('Subscription validation failed:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to validate subscription limits',
                code: 'SUBSCRIPTION_VALIDATION_ERROR'
            });
        }
    };
};



// Middleware to check if user has a specific feature
const requireFeature = (feature) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            const limits = user.subscriptionLimits;

            let hasFeature = false;

            switch (feature) {
                case 'excel_import':
                    hasFeature = limits.canImportExcel;
                    break;
                case 'analytics':
                    hasFeature = limits.canUseAnalytics;
                    break;
                default:
                    logger.warn(`Unknown feature check: ${feature}`);
                    hasFeature = true; // Default to allowing if feature is unknown
            }

            if (!hasFeature) {
                return res.status(403).json({
                    success: false,
                    message: `This feature requires a premium subscription. Current plan: ${user.subscriptionTier}`,
                    code: 'FEATURE_NOT_AVAILABLE',
                    data: {
                        feature,
                        tier: user.subscriptionTier,
                        requiredTier: 'premium'
                    }
                });
            }

            next();
        } catch (error) {
            logger.error('Feature check failed:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check feature availability'
            });
        }
    };
};

// Middleware to check if user is a test center owner
const requireTestCenterOwner = (req, res, next) => {
    try {
        if (req.user.role !== 'test_center_owner') {
            return res.status(403).json({
                success: false,
                message: 'This action requires test center owner privileges',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }
        next();
    } catch (error) {
        logger.error('Test center owner check failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check user permissions'
        });
    }
};

export {
    requireSubscription,
    requireFeature,
    requireTestCenterOwner
};
