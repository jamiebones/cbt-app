import express from 'express';
import { authController } from './controller.js';
import { authenticate } from './middleware.js';

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Protected routes (require authentication)
router.use(authenticate);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.post('/change-password', authController.changePassword);
router.get('/me', authController.getCurrentUser);

export default router;