import express from 'express';
import { subscriptionController } from './controller.js';

const router = express.Router();

// Subscription management routes
router.get('/', subscriptionController.getSubscriptions);
router.get('/:centerId', subscriptionController.getSubscriptionByCenter);
router.post('/:centerId/upgrade', subscriptionController.upgradeSubscription);
router.post('/:centerId/downgrade', subscriptionController.downgradeSubscription);

// Subscription validation routes
router.get('/:centerId/limits', subscriptionController.getSubscriptionLimits);
router.post('/:centerId/validate', subscriptionController.validateSubscriptionAction);

export default router;