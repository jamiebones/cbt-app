import express from 'express';
import { authController } from './controller.js';
import { authenticate } from './middleware.js';
import {
    loginRateLimiter,
    registrationRateLimiter,
    passwordResetRateLimiter,
    apiRateLimiter
} from '../../middleware/rateLimiter.js';

const router = express.Router();

// Public routes with rate limiting
router.post('/register', registrationRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);
router.post('/request-password-reset', passwordResetRateLimiter, authController.requestPasswordReset);
router.post('/reset-password', passwordResetRateLimiter, authController.resetPassword);
// Public: list available test centers for student signup
router.get('/centers', authController.listCenters);

// Protected routes (require authentication)
router.use(authenticate);
router.use(apiRateLimiter); // Apply general API rate limiting to authenticated routes
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.post('/change-password', authController.changePassword);
router.get('/me', authController.getCurrentUser);

export default router;