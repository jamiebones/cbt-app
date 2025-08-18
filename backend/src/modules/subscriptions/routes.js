import express from 'express';
import { subscriptionController } from './controller.js';
import { authenticate } from '../auth/middleware.js';

const router = express.Router();

// All subscription routes require authentication
router.use(authenticate);

// Subscription information routes
router.get('/me', subscriptionController.getSubscription);
router.get('/tiers', subscriptionController.getAvailableTiers);
router.get('/limits', subscriptionController.getSubscriptionLimits);
router.get('/usage', subscriptionController.getUsageStats);

// Subscription management routes
router.post('/upgrade', subscriptionController.upgradeSubscription);
router.post('/downgrade', subscriptionController.downgradeSubscription);
router.post('/cancel', subscriptionController.cancelSubscription);
router.post('/renew', subscriptionController.renewSubscription);

// Subscription validation routes
router.post('/validate', subscriptionController.validateSubscriptionAction);

// Admin routes (for test center owners accessing specific centers)
router.get('/:centerId', subscriptionController.getSubscriptionByCenter);

export default router;