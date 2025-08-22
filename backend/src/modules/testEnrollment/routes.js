import express from 'express';
import { testEnrollmentController } from './controller.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// Middleware for role-based authorization
const authorize = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        next();
    };
};

// Public webhook endpoint (no auth required)
router.post('/webhook', testEnrollmentController.handlePaymentWebhook);

// Student enrollment routes
router.post('/enroll',
    authenticateToken,
    authorize(['student']),
    testEnrollmentController.enrollForTest
);

router.post('/tests/:testId/validate-access-code',
    authenticateToken,
    authorize(['student']),
    testEnrollmentController.validateAccessCode
);

router.get('/my-enrollments',
    authenticateToken,
    authorize(['student']),
    testEnrollmentController.getMyEnrollments
);

router.post('/:enrollmentId/pay',
    authenticateToken,
    testEnrollmentController.processPayment
);

router.delete('/:enrollmentId',
    authenticateToken,
    testEnrollmentController.cancelEnrollment
);

// Admin routes
router.get('/tests/:testId/enrollments',
    authenticateToken,
    authorize(['test_center_owner', 'test_creator']),
    testEnrollmentController.getTestEnrollments
);

router.get('/tests/:testId/enrollment-stats',
    authenticateToken,
    authorize(['test_center_owner', 'test_creator']),
    testEnrollmentController.getEnrollmentStatistics
);

export default router;
