import { testEnrollmentService } from './service.js';
import { logger } from '../../config/logger.js';

class TestEnrollmentController {
    constructor() {
        this.service = testEnrollmentService;
    }

    // Enroll student for test
    enrollForTest = async (req, res) => {
        try {
            logger.info('Enroll for test endpoint called');
            const { testId } = req.body;
            const studentId = req.user.id;
            const enrollmentData = req.body;

            if (!testId) {
                return res.status(400).json({
                    success: false,
                    message: 'Test ID is required'
                });
            }

            // Validate student role
            if (req.user.role !== 'student') {
                return res.status(403).json({
                    success: false,
                    message: 'Only students can enroll for tests'
                });
            }

            const result = await this.service.enrollStudent(testId, studentId, enrollmentData);

            res.status(201).json({
                success: true,
                message: 'Enrollment created successfully',
                data: result
            });

        } catch (error) {
            logger.error('Enroll for test failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to enroll for test'
            });
        }
    };

    // Process enrollment payment
    processPayment = async (req, res) => {
        try {
            logger.info('Process enrollment payment endpoint called');
            const { enrollmentId } = req.params;
            const paymentDetails = req.body;
            const userId = req.user.id;

            // Verify enrollment belongs to user or user has admin access
            const enrollment = await this.service.validateEnrollmentAccess(enrollmentId, userId, req.user.role);

            const result = await this.service.processPayment(enrollmentId, paymentDetails);

            res.json({
                success: true,
                message: 'Payment processed successfully',
                data: result
            });

        } catch (error) {
            logger.error('Process payment failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to process payment'
            });
        }
    };

    // Get test enrollments (admin view)
    getTestEnrollments = async (req, res) => {
        try {
            logger.info('Get test enrollments endpoint called');
            const { testId } = req.params;
            const ownerId = req.user.role === 'test_center_owner' ? req.user.id : req.user.testCenterOwner;
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                enrollmentStatus: req.query.enrollmentStatus,
                paymentStatus: req.query.paymentStatus,
                search: req.query.search
            };

            if (!ownerId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const result = await this.service.getTestEnrollments(testId, ownerId, options);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Get test enrollments failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get test enrollments'
            });
        }
    };

    // Get student's enrollments
    getMyEnrollments = async (req, res) => {
        try {
            logger.info('Get my enrollments endpoint called');
            const studentId = req.user.id;
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                enrollmentStatus: req.query.enrollmentStatus,
                paymentStatus: req.query.paymentStatus
            };

            const result = await this.service.getStudentEnrollments(studentId, options);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Get my enrollments failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get enrollments'
            });
        }
    };

    // Cancel enrollment
    cancelEnrollment = async (req, res) => {
        try {
            logger.info('Cancel enrollment endpoint called');
            const { enrollmentId } = req.params;
            const { reason } = req.body;
            const userId = req.user.id;

            const result = await this.service.cancelEnrollment(enrollmentId, reason, userId);

            res.json({
                success: true,
                message: 'Enrollment cancelled successfully',
                data: result
            });

        } catch (error) {
            logger.error('Cancel enrollment failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to cancel enrollment'
            });
        }
    };

    // Validate access code
    validateAccessCode = async (req, res) => {
        try {
            logger.info('Validate access code endpoint called');
            const { accessCode } = req.body;
            const { testId } = req.params;
            const studentId = req.user.id;

            if (req.user.role !== 'student') {
                return res.status(403).json({
                    success: false,
                    message: 'Only students can validate access codes'
                });
            }

            const enrollment = await this.service.validateAccessCode(accessCode, studentId, testId);

            res.json({
                success: true,
                message: 'Access code validated successfully',
                data: {
                    enrollment: {
                        id: enrollment._id,
                        accessCode: enrollment.accessCode,
                        test: enrollment.test,
                        canTakeTest: enrollment.canTakeTest,
                        expiresAt: enrollment.expiresAt
                    }
                }
            });

        } catch (error) {
            logger.error('Validate access code failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Invalid access code'
            });
        }
    };

    // Handle payment webhook
    handlePaymentWebhook = async (req, res) => {
        try {
            logger.info('Payment webhook endpoint called');
            const webhookData = req.body;

            const result = await this.service.handlePaymentWebhook(webhookData);

            res.json({
                success: true,
                message: 'Webhook processed successfully',
                data: result
            });

        } catch (error) {
            logger.error('Payment webhook failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to process webhook'
            });
        }
    };

    // Get enrollment statistics
    getEnrollmentStatistics = async (req, res) => {
        try {
            logger.info('Get enrollment statistics endpoint called');
            const { testId } = req.params;
            const ownerId = req.user.role === 'test_center_owner' ? req.user.id : req.user.testCenterOwner;

            if (!ownerId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const statistics = await this.service.getEnrollmentStatistics(testId);

            res.json({
                success: true,
                data: statistics
            });

        } catch (error) {
            logger.error('Get enrollment statistics failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get enrollment statistics'
            });
        }
    };
}

// Create singleton instance
const testEnrollmentController = new TestEnrollmentController();

export { testEnrollmentController };
