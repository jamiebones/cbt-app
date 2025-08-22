import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../server.js';

const { ObjectId } = mongoose.Types;

// Mock the services
vi.mock('../../modules/testEnrollment/service.js', () => ({
    testEnrollmentService: {
        enrollStudent: vi.fn(),
        processPayment: vi.fn(),
        validateAccessCode: vi.fn(),
        getTestEnrollments: vi.fn(),
        getStudentEnrollments: vi.fn(),
        cancelEnrollment: vi.fn(),
        getEnrollmentStatistics: vi.fn(),
        handlePaymentWebhook: vi.fn()
    }
}));

// Mock authentication middleware
vi.mock('../../middleware/auth.js', () => ({
    authenticateToken: (req, res, next) => {
        req.user = {
            _id: new ObjectId(),
            role: 'student',
            email: 'test@example.com'
        };
        next();
    },
    requireRole: (roles) => (req, res, next) => {
        if (Array.isArray(roles) && roles.includes(req.user.role)) {
            next();
        } else if (roles === req.user.role) {
            next();
        } else {
            res.status(403).json({ error: 'Insufficient permissions' });
        }
    }
}));

import { testEnrollmentService } from '../../modules/testEnrollment/service.js';

describe('TestEnrollment Controller - Complete API Testing', () => {
    let testUser, ownerUser, testId, enrollmentId;

    beforeEach(() => {
        vi.clearAllMocks();

        testUser = {
            _id: new ObjectId(),
            role: 'student',
            email: 'student@test.com'
        };

        ownerUser = {
            _id: new ObjectId(),
            role: 'test_center_owner',
            email: 'owner@test.com'
        };

        testId = new ObjectId();
        enrollmentId = new ObjectId();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('POST /api/test-enrollments/enroll - Student Enrollment', () => {
        it('should enroll student successfully', async () => {
            // Arrange
            const enrollmentData = {
                testId: testId.toString(),
                notes: 'Test enrollment'
            };

            const mockEnrollment = {
                _id: enrollmentId,
                test: testId,
                student: testUser._id,
                accessCode: 'ABC123DEF',
                enrollmentStatus: 'payment_pending'
            };

            const mockPaymentData = {
                transactionId: 'TXN_123456',
                paymentUrl: 'https://payment.example.com/pay/123456'
            };

            testEnrollmentService.enrollStudent.mockResolvedValue({
                enrollment: mockEnrollment,
                paymentData: mockPaymentData
            });

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/enroll')
                .send(enrollmentData)
                .expect(201);

            // Assert
            expect(testEnrollmentService.enrollStudent).toHaveBeenCalledWith(
                testId.toString(),
                testUser._id,
                { notes: 'Test enrollment' }
            );
            expect(response.body.success).toBe(true);
            expect(response.body.data.enrollment._id).toBe(enrollmentId.toString());
            expect(response.body.data.paymentData).toEqual(mockPaymentData);
        });

        it('should handle enrollment validation errors', async () => {
            // Arrange
            const enrollmentData = {
                testId: testId.toString()
            };

            testEnrollmentService.enrollStudent.mockRejectedValue(
                new Error('Test not found')
            );

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/enroll')
                .send(enrollmentData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Test not found');
        });

        it('should handle missing testId', async () => {
            // Arrange
            const enrollmentData = {
                notes: 'Missing test ID'
            };

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/enroll')
                .send(enrollmentData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Test ID is required');
        });

        it('should handle invalid testId format', async () => {
            // Arrange
            const enrollmentData = {
                testId: 'invalid-id-format'
            };

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/enroll')
                .send(enrollmentData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid test ID format');
        });

        it('should handle service errors gracefully', async () => {
            // Arrange
            const enrollmentData = {
                testId: testId.toString()
            };

            testEnrollmentService.enrollStudent.mockRejectedValue(
                new Error('Database connection failed')
            );

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/enroll')
                .send(enrollmentData)
                .expect(500);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Internal server error');
        });
    });

    describe('POST /api/test-enrollments/:enrollmentId/payment - Payment Processing', () => {
        it('should process payment successfully', async () => {
            // Arrange
            const paymentData = {
                transactionId: 'TXN_123456',
                paymentMethod: 'card'
            };

            const mockEnrollment = {
                _id: enrollmentId,
                enrollmentStatus: 'enrolled',
                paymentStatus: 'completed'
            };

            testEnrollmentService.processPayment.mockResolvedValue(mockEnrollment);

            // Act
            const response = await request(app)
                .post(`/api/test-enrollments/${enrollmentId}/payment`)
                .send(paymentData)
                .expect(200);

            // Assert
            expect(testEnrollmentService.processPayment).toHaveBeenCalledWith(
                enrollmentId.toString(),
                paymentData
            );
            expect(response.body.success).toBe(true);
            expect(response.body.data.enrollmentStatus).toBe('enrolled');
        });

        it('should handle payment processing errors', async () => {
            // Arrange
            const paymentData = {
                transactionId: 'TXN_INVALID'
            };

            testEnrollmentService.processPayment.mockRejectedValue(
                new Error('Payment verification failed')
            );

            // Act
            const response = await request(app)
                .post(`/api/test-enrollments/${enrollmentId}/payment`)
                .send(paymentData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Payment verification failed');
        });

        it('should handle missing transactionId', async () => {
            // Arrange
            const paymentData = {
                paymentMethod: 'card'
            };

            // Act
            const response = await request(app)
                .post(`/api/test-enrollments/${enrollmentId}/payment`)
                .send(paymentData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Transaction ID is required');
        });

        it('should handle invalid enrollment ID', async () => {
            // Arrange
            const paymentData = {
                transactionId: 'TXN_123456'
            };

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/invalid-id/payment')
                .send(paymentData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid enrollment ID format');
        });
    });

    describe('POST /api/test-enrollments/validate-access - Access Code Validation', () => {
        it('should validate access code successfully', async () => {
            // Arrange
            const accessData = {
                accessCode: 'ABC123DEF',
                testId: testId.toString()
            };

            const mockEnrollment = {
                _id: enrollmentId,
                accessCode: 'ABC123DEF',
                enrollmentStatus: 'enrolled',
                test: {
                    _id: testId,
                    title: 'Math Test'
                }
            };

            testEnrollmentService.validateAccessCode.mockResolvedValue(mockEnrollment);

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/validate-access')
                .send(accessData)
                .expect(200);

            // Assert
            expect(testEnrollmentService.validateAccessCode).toHaveBeenCalledWith(
                'ABC123DEF',
                testUser._id,
                testId.toString()
            );
            expect(response.body.success).toBe(true);
            expect(response.body.data.valid).toBe(true);
            expect(response.body.data.enrollment).toEqual(mockEnrollment);
        });

        it('should handle invalid access code', async () => {
            // Arrange
            const accessData = {
                accessCode: 'INVALID123',
                testId: testId.toString()
            };

            testEnrollmentService.validateAccessCode.mockRejectedValue(
                new Error('Invalid access code or unauthorized access')
            );

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/validate-access')
                .send(accessData)
                .expect(401);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid access code or unauthorized access');
        });

        it('should handle missing access code', async () => {
            // Arrange
            const accessData = {
                testId: testId.toString()
            };

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/validate-access')
                .send(accessData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Access code is required');
        });

        it('should handle missing test ID for validation', async () => {
            // Arrange
            const accessData = {
                accessCode: 'ABC123DEF'
            };

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/validate-access')
                .send(accessData)
                .expect(200);

            // Assert
            expect(testEnrollmentService.validateAccessCode).toHaveBeenCalledWith(
                'ABC123DEF',
                testUser._id,
                undefined
            );
        });
    });

    describe('GET /api/tests/:testId/enrollments - Get Test Enrollments', () => {
        beforeEach(() => {
            // Mock owner role for this test suite
            vi.mocked(require('../../middleware/auth.js').authenticateToken).mockImplementation(
                (req, res, next) => {
                    req.user = ownerUser;
                    next();
                }
            );
        });

        it('should get test enrollments successfully', async () => {
            // Arrange
            const mockEnrollments = [
                {
                    _id: enrollmentId,
                    student: {
                        _id: testUser._id,
                        firstName: 'John',
                        lastName: 'Student'
                    },
                    enrollmentStatus: 'enrolled'
                }
            ];

            const mockResponse = {
                enrollments: mockEnrollments,
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    pages: 1
                },
                statistics: {
                    totalEnrollments: 1,
                    activeEnrollments: 1
                }
            };

            testEnrollmentService.getTestEnrollments.mockResolvedValue(mockResponse);

            // Act
            const response = await request(app)
                .get(`/api/tests/${testId}/enrollments`)
                .expect(200);

            // Assert
            expect(testEnrollmentService.getTestEnrollments).toHaveBeenCalledWith(
                testId.toString(),
                ownerUser._id,
                { page: 1, limit: 20 }
            );
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockResponse);
        });

        it('should handle pagination parameters', async () => {
            // Arrange
            testEnrollmentService.getTestEnrollments.mockResolvedValue({
                enrollments: [],
                pagination: { page: 2, limit: 10, total: 0, pages: 0 },
                statistics: {}
            });

            // Act
            const response = await request(app)
                .get(`/api/tests/${testId}/enrollments`)
                .query({ page: 2, limit: 10 })
                .expect(200);

            // Assert
            expect(testEnrollmentService.getTestEnrollments).toHaveBeenCalledWith(
                testId.toString(),
                ownerUser._id,
                { page: 2, limit: 10 }
            );
        });

        it('should handle search functionality', async () => {
            // Arrange
            testEnrollmentService.getTestEnrollments.mockResolvedValue({
                enrollments: [],
                pagination: { page: 1, limit: 20, total: 0, pages: 0 },
                statistics: {}
            });

            // Act
            const response = await request(app)
                .get(`/api/tests/${testId}/enrollments`)
                .query({ search: 'john', status: 'enrolled' })
                .expect(200);

            // Assert
            expect(testEnrollmentService.getTestEnrollments).toHaveBeenCalledWith(
                testId.toString(),
                ownerUser._id,
                { page: 1, limit: 20, search: 'john', status: 'enrolled' }
            );
        });

        it('should handle unauthorized access', async () => {
            // Arrange
            testEnrollmentService.getTestEnrollments.mockRejectedValue(
                new Error('Test not found or access denied')
            );

            // Act
            const response = await request(app)
                .get(`/api/tests/${testId}/enrollments`)
                .expect(404);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Test not found or access denied');
        });
    });

    describe('GET /api/test-enrollments/my-enrollments - Get Student Enrollments', () => {
        it('should get student enrollments successfully', async () => {
            // Arrange
            const mockEnrollments = [
                {
                    _id: enrollmentId,
                    test: {
                        _id: testId,
                        title: 'Math Test'
                    },
                    enrollmentStatus: 'enrolled'
                }
            ];

            const mockResponse = {
                enrollments: mockEnrollments,
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    pages: 1
                }
            };

            testEnrollmentService.getStudentEnrollments.mockResolvedValue(mockResponse);

            // Act
            const response = await request(app)
                .get('/api/test-enrollments/my-enrollments')
                .expect(200);

            // Assert
            expect(testEnrollmentService.getStudentEnrollments).toHaveBeenCalledWith(
                testUser._id,
                { page: 1, limit: 20 }
            );
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockResponse);
        });

        it('should handle filtering by status', async () => {
            // Arrange
            testEnrollmentService.getStudentEnrollments.mockResolvedValue({
                enrollments: [],
                pagination: { page: 1, limit: 20, total: 0, pages: 0 }
            });

            // Act
            const response = await request(app)
                .get('/api/test-enrollments/my-enrollments')
                .query({ status: 'payment_pending' })
                .expect(200);

            // Assert
            expect(testEnrollmentService.getStudentEnrollments).toHaveBeenCalledWith(
                testUser._id,
                { page: 1, limit: 20, status: 'payment_pending' }
            );
        });
    });

    describe('DELETE /api/test-enrollments/:enrollmentId - Cancel Enrollment', () => {
        it('should cancel enrollment successfully', async () => {
            // Arrange
            const cancellationData = {
                reason: 'Student request'
            };

            const mockResponse = {
                enrollment: {
                    _id: enrollmentId,
                    enrollmentStatus: 'cancelled'
                },
                refundData: {
                    refundId: 'REF_123456',
                    status: 'completed'
                }
            };

            testEnrollmentService.cancelEnrollment.mockResolvedValue(mockResponse);

            // Act
            const response = await request(app)
                .delete(`/api/test-enrollments/${enrollmentId}`)
                .send(cancellationData)
                .expect(200);

            // Assert
            expect(testEnrollmentService.cancelEnrollment).toHaveBeenCalledWith(
                enrollmentId.toString(),
                'Student request',
                testUser._id
            );
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockResponse);
        });

        it('should handle cancellation without reason', async () => {
            // Arrange
            const mockResponse = {
                enrollment: {
                    _id: enrollmentId,
                    enrollmentStatus: 'cancelled'
                },
                refundData: null
            };

            testEnrollmentService.cancelEnrollment.mockResolvedValue(mockResponse);

            // Act
            const response = await request(app)
                .delete(`/api/test-enrollments/${enrollmentId}`)
                .expect(200);

            // Assert
            expect(testEnrollmentService.cancelEnrollment).toHaveBeenCalledWith(
                enrollmentId.toString(),
                undefined,
                testUser._id
            );
        });

        it('should handle cancellation errors', async () => {
            // Arrange
            testEnrollmentService.cancelEnrollment.mockRejectedValue(
                new Error('Enrollment is already cancelled')
            );

            // Act
            const response = await request(app)
                .delete(`/api/test-enrollments/${enrollmentId}`)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Enrollment is already cancelled');
        });
    });

    describe('GET /api/tests/:testId/enrollment-stats - Get Enrollment Statistics', () => {
        beforeEach(() => {
            // Mock owner role for statistics
            vi.mocked(require('../../middleware/auth.js').authenticateToken).mockImplementation(
                (req, res, next) => {
                    req.user = ownerUser;
                    next();
                }
            );
        });

        it('should get enrollment statistics successfully', async () => {
            // Arrange
            const mockStats = {
                totalEnrollments: 100,
                activeEnrollments: 85,
                pendingPayments: 10,
                totalRevenue: 8500,
                statusBreakdown: {
                    enrolled: 85,
                    payment_pending: 10,
                    cancelled: 5
                }
            };

            testEnrollmentService.getEnrollmentStatistics.mockResolvedValue(mockStats);

            // Act
            const response = await request(app)
                .get(`/api/tests/${testId}/enrollment-stats`)
                .expect(200);

            // Assert
            expect(testEnrollmentService.getEnrollmentStatistics).toHaveBeenCalledWith(
                testId.toString()
            );
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockStats);
        });

        it('should handle statistics generation errors', async () => {
            // Arrange
            testEnrollmentService.getEnrollmentStatistics.mockRejectedValue(
                new Error('Failed to generate statistics')
            );

            // Act
            const response = await request(app)
                .get(`/api/tests/${testId}/enrollment-stats`)
                .expect(500);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Internal server error');
        });
    });

    describe('POST /api/test-enrollments/webhook - Payment Webhook', () => {
        it('should handle payment webhook successfully', async () => {
            // Arrange
            const webhookData = {
                event: 'payment.completed',
                transactionId: 'TXN_123456',
                timestamp: Date.now()
            };

            const mockResponse = {
                event: 'payment.completed',
                transactionId: 'TXN_123456',
                processed: true
            };

            testEnrollmentService.handlePaymentWebhook.mockResolvedValue(mockResponse);

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/webhook')
                .set('X-Webhook-Signature', 'valid_signature')
                .send(webhookData)
                .expect(200);

            // Assert
            expect(testEnrollmentService.handlePaymentWebhook).toHaveBeenCalledWith({
                ...webhookData,
                signature: 'valid_signature'
            });
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockResponse);
        });

        it('should handle webhook without signature', async () => {
            // Arrange
            const webhookData = {
                event: 'payment.completed',
                transactionId: 'TXN_123456'
            };

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/webhook')
                .send(webhookData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Webhook signature is required');
        });

        it('should handle webhook processing errors', async () => {
            // Arrange
            const webhookData = {
                event: 'payment.failed',
                transactionId: 'TXN_FAILED'
            };

            testEnrollmentService.handlePaymentWebhook.mockRejectedValue(
                new Error('Invalid webhook signature')
            );

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/webhook')
                .set('X-Webhook-Signature', 'invalid_signature')
                .send(webhookData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid webhook signature');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle malformed JSON requests', async () => {
            // Act
            const response = await request(app)
                .post('/api/test-enrollments/enroll')
                .type('json')
                .send('{ invalid json }')
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
        });

        it('should handle very large request bodies', async () => {
            // Arrange
            const largeData = {
                testId: testId.toString(),
                notes: 'x'.repeat(10000) // 10KB of data
            };

            testEnrollmentService.enrollStudent.mockResolvedValue({
                enrollment: { _id: enrollmentId },
                paymentData: null
            });

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/enroll')
                .send(largeData)
                .expect(201);

            // Assert
            expect(response.body.success).toBe(true);
        });

        it('should handle concurrent requests gracefully', async () => {
            // Arrange
            const enrollmentData = {
                testId: testId.toString()
            };

            testEnrollmentService.enrollStudent.mockResolvedValue({
                enrollment: { _id: enrollmentId },
                paymentData: null
            });

            // Act
            const requests = Array.from({ length: 10 }, () =>
                request(app)
                    .post('/api/test-enrollments/enroll')
                    .send(enrollmentData)
            );

            const responses = await Promise.allSettled(requests);

            // Assert
            expect(responses).toHaveLength(10);
            expect(responses.every(r => r.status === 'fulfilled')).toBe(true);
        });

        it('should handle network timeouts gracefully', async () => {
            // Arrange
            const enrollmentData = {
                testId: testId.toString()
            };

            testEnrollmentService.enrollStudent.mockImplementation(
                () => new Promise(resolve => setTimeout(resolve, 100))
            );

            // Act
            const response = await request(app)
                .post('/api/test-enrollments/enroll')
                .send(enrollmentData)
                .timeout(50)
                .expect(408);

            // Assert - Should handle timeout appropriately
        });

        it('should validate all required middleware is applied', async () => {
            // This test ensures authentication is properly applied
            // by checking that req.user is set in all protected routes

            // Test enrollment endpoint
            await request(app)
                .post('/api/test-enrollments/enroll')
                .send({ testId: testId.toString() })
                .expect(201);

            expect(testEnrollmentService.enrollStudent).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Object), // Should be user ID from auth middleware
                expect.any(Object)
            );
        });
    });
});
