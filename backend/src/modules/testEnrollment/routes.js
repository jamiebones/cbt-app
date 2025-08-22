import express from 'express';
import { testEnrollmentController } from './controller.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// Public webhook endpoint (no auth required)
router.post('/webhook', testEnrollmentController.handlePaymentWebhook);

// Student enrollment routes
router.post('/enroll',
    authenticateToken,
    requireRole(['student']),
    testEnrollmentController.enrollForTest
);

router.post('/tests/:testId/validate-access-code',
    authenticateToken,
    requireRole(['student']),
    testEnrollmentController.validateAccessCode
);

router.get('/my-enrollments',
    authenticateToken,
    requireRole(['student']),
    testEnrollmentController.getMyEnrollments
);

router.post('/:enrollmentId/pay',
    authenticateToken,
    testEnrollmentController.processPayment
);

router.delete('/:enrollmentId',
    authenticateToken,
    requireRole(['test_center_owner']),
    testEnrollmentController.cancelEnrollment
);

// Admin routes
router.get('/tests/:testId/enrollments',
    authenticateToken,
    requireRole(['test_center_owner', 'test_creator']),
    testEnrollmentController.getTestEnrollments
);

router.get('/tests/:testId/enrollment-stats',
    authenticateToken,
    requireRole(['test_center_owner', 'test_creator']),
    testEnrollmentController.getEnrollmentStatistics
);

export default router;
