import { logger } from "../../config/logger.js";

class SubscriptionController {
    getSubscriptions = async (req, res) => {
        logger.info('Get subscriptions endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get subscriptions not implemented yet'
        });
    };

    getSubscriptionByCenter = async (req, res) => {
        logger.info('Get subscription by center endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get subscription by center not implemented yet'
        });
    };

    upgradeSubscription = async (req, res) => {
        logger.info('Upgrade subscription endpoint called');
        res.status(501).json({
            success: false,
            message: 'Upgrade subscription not implemented yet'
        });
    };

    downgradeSubscription = async (req, res) => {
        logger.info('Downgrade subscription endpoint called');
        res.status(501).json({
            success: false,
            message: 'Downgrade subscription not implemented yet'
        });
    };

    getSubscriptionLimits = async (req, res) => {
        logger.info('Get subscription limits endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get subscription limits not implemented yet'
        });
    };

    validateSubscriptionAction = async (req, res) => {
        logger.info('Validate subscription action endpoint called');
        res.status(501).json({
            success: false,
            message: 'Validate subscription action not implemented yet'
        });
    };
}

const subscriptionController = new SubscriptionController();

export { subscriptionController };