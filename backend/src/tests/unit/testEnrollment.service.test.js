import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { testEnrollmentService } from '../../modules/testEnrollment/service.js';

const { ObjectId } = mongoose.Types;

// Mock the models and services
vi.mock('../../models/index.js', () => ({
    TestEnrollment: vi.fn(),
    Test: vi.fn(),
    User: vi.fn()
}));

vi.mock('../../modules/payment/service.js', () => ({
    paymentService: {
        initializePayment: vi.fn(),
        verifyPayment: vi.fn(),
        processRefund: vi.fn(),
        handleWebhook: vi.fn()
    }
}));

vi.mock('../../modules/subscriptions/service.js', () => ({
    subscriptionService: {
        validateAction: vi.fn()
    }
}));

// Mock logger
vi.mock('../../config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn()
    }
}));

import { TestEnrollment, Test, User } from '../../models/index.js';
import { paymentService } from '../../modules/payment/service.js';
import { logger } from '../../config/logger.js';

describe('TestEnrollmentService - Complete Coverage', () => {
    let mockOwner, mockStudent, mockTest, mockEnrollment;

    beforeEach(() => {
        vi.clearAllMocks();

        // Set up model static methods
        TestEnrollment.findOne = vi.fn();
        TestEnrollment.find = vi.fn();
        TestEnrollment.findById = vi.fn();
        TestEnrollment.countDocuments = vi.fn();
        TestEnrollment.aggregate = vi.fn();
        TestEnrollment.findByIdAndUpdate = vi.fn();

        Test.findById = vi.fn();
        Test.findOne = vi.fn();
        Test.findByIdAndUpdate = vi.fn();

        User.findById = vi.fn();
        User.find = vi.fn();

        // Create mock data with ObjectIds
        mockOwner = {
            _id: new ObjectId(),
            role: 'test_center_owner',
            email: 'owner@test.com'
        };

        mockStudent = {
            _id: new ObjectId(),
            role: 'student',
            firstName: 'John',
            lastName: 'Student',
            email: 'student@test.com',
            studentRegNumber: 'STU001'
        };

        mockTest = {
            _id: new ObjectId(),
            title: 'Math Test',
            description: 'Basic mathematics test',
            testCenterOwner: mockOwner._id,
            enrollmentConfig: {
                isEnrollmentRequired: true,
                enrollmentFee: 100,
                maxEnrollments: 50,
                requirePayment: true,
                allowLateEnrollment: false,
                autoApprove: true
            },
            canBeStarted: vi.fn().mockReturnValue(true)
        };

        mockEnrollment = {
            _id: new ObjectId(),
            test: mockTest._id,
            student: mockStudent._id,
            testCenterOwner: mockOwner._id,
            accessCode: 'ABC123DEF',
            paymentAmount: 100,
            paymentStatus: 'pending',
            enrollmentStatus: 'payment_pending',
            accessCodeUsed: false,
            save: vi.fn().mockResolvedValue(true),
            populate: vi.fn().mockReturnThis(),
            markPaymentCompleted: vi.fn().mockResolvedValue(true),
            cancel: vi.fn().mockResolvedValue(true)
        };

        // Mock logger methods
        logger.info.mockClear();
        logger.error.mockClear();
    });

    describe('enrollStudent - Student Enrollment', () => {
        it('should enroll student successfully with payment required', async () => {
            // Arrange
            Test.findById.mockResolvedValue(mockTest);
            User.findById.mockResolvedValue(mockStudent);
            TestEnrollment.countDocuments.mockResolvedValue(5);
            TestEnrollment.findOne.mockResolvedValue(null);
            TestEnrollment.mockImplementation(() => mockEnrollment);

            paymentService.initializePayment.mockResolvedValue({
                transactionId: 'TXN_123456',
                paymentUrl: 'https://payment.example.com/pay/123456',
                status: 'pending'
            });

            // Mock crypto module
            vi.doMock('crypto', () => ({
                randomBytes: vi.fn().mockReturnValue({ toString: vi.fn().mockReturnValue('abcdef123456') })
            }));

            // Act
            const result = await testEnrollmentService.enrollStudent(
                mockTest._id,
                mockStudent._id,
                { notes: 'Test enrollment' }
            );

            // Assert
            expect(Test.findById).toHaveBeenCalledWith(mockTest._id);
            expect(User.findById).toHaveBeenCalledWith(mockStudent._id);
            expect(TestEnrollment.countDocuments).toHaveBeenCalledWith({
                test: mockTest._id,
                enrollmentStatus: { $in: ['enrolled', 'payment_pending'] }
            });
            expect(paymentService.initializePayment).toHaveBeenCalledWith(
                100,
                'NGN',
                {
                    enrollmentId: mockEnrollment._id,
                    testId: mockTest._id,
                    studentId: mockStudent._id,
                    type: 'test_enrollment'
                }
            );
            expect(result.enrollment).toBe(mockEnrollment);
            expect(result.paymentData).toBeDefined();
        });

        it('should enroll student successfully for free test', async () => {
            // Arrange
            const freeTest = {
                ...mockTest,
                enrollmentConfig: {
                    ...mockTest.enrollmentConfig,
                    enrollmentFee: 0,
                    requirePayment: false
                }
            };

            Test.findById.mockResolvedValue(freeTest);
            User.findById.mockResolvedValue(mockStudent);
            TestEnrollment.countDocuments.mockResolvedValue(5);
            TestEnrollment.findOne.mockResolvedValue(null);
            TestEnrollment.mockImplementation(() => ({
                ...mockEnrollment,
                paymentAmount: 0,
                paymentStatus: 'completed',
                enrollmentStatus: 'enrolled',
                paymentMethod: 'free'
            }));

            // Act
            const result = await testEnrollmentService.enrollStudent(
                mockTest._id,
                mockStudent._id
            );

            // Assert
            expect(paymentService.initializePayment).not.toHaveBeenCalled();
            expect(result.paymentData).toBeNull();
        });

        it('should throw error when test not found', async () => {
            // Arrange
            Test.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(testEnrollmentService.enrollStudent(mockTest._id, mockStudent._id))
                .rejects.toThrow('Test not found');
        });

        it('should throw error when test does not require enrollment', async () => {
            // Arrange
            const nonEnrollmentTest = {
                ...mockTest,
                enrollmentConfig: { isEnrollmentRequired: false }
            };
            Test.findById.mockResolvedValue(nonEnrollmentTest);

            // Act & Assert
            await expect(testEnrollmentService.enrollStudent(mockTest._id, mockStudent._id))
                .rejects.toThrow('This test does not require enrollment');
        });

        it('should throw error when enrollment deadline passed', async () => {
            // Arrange
            const expiredTest = {
                ...mockTest,
                enrollmentConfig: {
                    ...mockTest.enrollmentConfig,
                    enrollmentDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    allowLateEnrollment: false
                }
            };
            Test.findById.mockResolvedValue(expiredTest);

            // Act & Assert
            await expect(testEnrollmentService.enrollStudent(mockTest._id, mockStudent._id))
                .rejects.toThrow('Enrollment deadline has passed');
        });

        it('should throw error when maximum enrollment limit reached', async () => {
            // Arrange
            Test.findById.mockResolvedValue(mockTest);
            TestEnrollment.countDocuments.mockResolvedValue(50); // At max limit

            // Act & Assert
            await expect(testEnrollmentService.enrollStudent(mockTest._id, mockStudent._id))
                .rejects.toThrow('Maximum enrollment limit reached');
        });

        it('should throw error when student not valid', async () => {
            // Arrange
            Test.findById.mockResolvedValue(mockTest);
            TestEnrollment.countDocuments.mockResolvedValue(5);
            User.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(testEnrollmentService.enrollStudent(mockTest._id, mockStudent._id))
                .rejects.toThrow('Valid student account required');
        });

        it('should throw error when student already enrolled', async () => {
            // Arrange
            Test.findById.mockResolvedValue(mockTest);
            TestEnrollment.countDocuments.mockResolvedValue(5);
            User.findById.mockResolvedValue(mockStudent);
            TestEnrollment.findOne.mockResolvedValue({
                ...mockEnrollment,
                enrollmentStatus: 'enrolled'
            });

            // Act & Assert
            await expect(testEnrollmentService.enrollStudent(mockTest._id, mockStudent._id))
                .rejects.toThrow('Student is already enrolled for this test');
        });

        it('should handle database errors during enrollment', async () => {
            // Arrange
            Test.findById.mockRejectedValue(new Error('Database connection failed'));

            // Act & Assert
            await expect(testEnrollmentService.enrollStudent(mockTest._id, mockStudent._id))
                .rejects.toThrow('Database connection failed');
        });
    });

    describe('processPayment - Payment Processing', () => {
        it('should process payment successfully', async () => {
            // Arrange
            TestEnrollment.findById.mockResolvedValue(mockEnrollment);
            paymentService.verifyPayment.mockResolvedValue({
                status: 'completed',
                transactionId: 'TXN_123456',
                paymentMethod: 'card'
            });

            // Act
            const result = await testEnrollmentService.processPayment(
                mockEnrollment._id,
                { transactionId: 'TXN_123456', paymentMethod: 'card' }
            );

            // Assert
            expect(TestEnrollment.findById).toHaveBeenCalledWith(mockEnrollment._id);
            expect(paymentService.verifyPayment).toHaveBeenCalledWith('TXN_123456');
            expect(mockEnrollment.markPaymentCompleted).toHaveBeenCalledWith('TXN_123456', 'card');
            expect(result).toBe(mockEnrollment);
        });

        it('should throw error when enrollment not found', async () => {
            // Arrange
            TestEnrollment.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(testEnrollmentService.processPayment(mockEnrollment._id, {}))
                .rejects.toThrow('Enrollment not found');
        });

        it('should throw error when payment already completed', async () => {
            // Arrange
            const completedEnrollment = {
                ...mockEnrollment,
                paymentStatus: 'completed'
            };
            TestEnrollment.findById.mockResolvedValue(completedEnrollment);

            // Act & Assert
            await expect(testEnrollmentService.processPayment(mockEnrollment._id, {}))
                .rejects.toThrow('Payment already completed');
        });

        it('should handle payment verification failure', async () => {
            // Arrange
            TestEnrollment.findById.mockResolvedValue(mockEnrollment);
            paymentService.verifyPayment.mockResolvedValue({
                status: 'failed',
                transactionId: 'TXN_123456'
            });

            // Act & Assert
            await expect(testEnrollmentService.processPayment(mockEnrollment._id, {}))
                .rejects.toThrow('Payment verification failed');
            expect(mockEnrollment.save).toHaveBeenCalled();
        });

        it('should handle database errors during payment processing', async () => {
            // Arrange
            TestEnrollment.findById.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(testEnrollmentService.processPayment(mockEnrollment._id, {}))
                .rejects.toThrow('Database error');
        });
    });

    describe('validateAccessCode - Access Code Validation', () => {
        it('should validate access code successfully', async () => {
            // Arrange
            const validEnrollment = {
                ...mockEnrollment,
                enrollmentStatus: 'enrolled',
                paymentStatus: 'completed',
                accessCodeUsed: false,
                test: {
                    ...mockTest,
                    canBeStarted: vi.fn().mockReturnValue(true)
                }
            };

            TestEnrollment.findOne.mockReturnValue({
                populate: vi.fn().mockResolvedValue(validEnrollment)
            });

            // Act
            const result = await testEnrollmentService.validateAccessCode(
                'ABC123DEF',
                mockStudent._id,
                mockTest._id
            );

            // Assert
            expect(TestEnrollment.findOne).toHaveBeenCalledWith({
                accessCode: 'ABC123DEF',
                student: mockStudent._id,
                test: mockTest._id
            });
            expect(result).toBe(validEnrollment);
        });

        it('should throw error for invalid access code', async () => {
            // Arrange
            TestEnrollment.findOne.mockReturnValue({
                populate: vi.fn().mockResolvedValue(null)
            });

            // Act & Assert
            await expect(testEnrollmentService.validateAccessCode(
                'INVALID',
                mockStudent._id,
                mockTest._id
            )).rejects.toThrow('Invalid access code or unauthorized access');
        });

        it('should throw error when enrollment not active', async () => {
            // Arrange
            const inactiveEnrollment = {
                ...mockEnrollment,
                enrollmentStatus: 'cancelled'
            };

            TestEnrollment.findOne.mockReturnValue({
                populate: vi.fn().mockResolvedValue(inactiveEnrollment)
            });

            // Act & Assert
            await expect(testEnrollmentService.validateAccessCode(
                'ABC123DEF',
                mockStudent._id
            )).rejects.toThrow('Enrollment is not active');
        });

        it('should throw error when payment not completed', async () => {
            // Arrange
            const unpaidEnrollment = {
                ...mockEnrollment,
                enrollmentStatus: 'enrolled',
                paymentStatus: 'pending'
            };

            TestEnrollment.findOne.mockReturnValue({
                populate: vi.fn().mockResolvedValue(unpaidEnrollment)
            });

            // Act & Assert
            await expect(testEnrollmentService.validateAccessCode(
                'ABC123DEF',
                mockStudent._id
            )).rejects.toThrow('Payment required to access test');
        });

        it('should throw error when access code already used', async () => {
            // Arrange
            const usedEnrollment = {
                ...mockEnrollment,
                enrollmentStatus: 'enrolled',
                paymentStatus: 'completed',
                accessCodeUsed: true
            };

            TestEnrollment.findOne.mockReturnValue({
                populate: vi.fn().mockResolvedValue(usedEnrollment)
            });

            // Act & Assert
            await expect(testEnrollmentService.validateAccessCode(
                'ABC123DEF',
                mockStudent._id
            )).rejects.toThrow('Access code has already been used');
        });

        it('should throw error when test not available', async () => {
            // Arrange
            const validEnrollment = {
                ...mockEnrollment,
                enrollmentStatus: 'enrolled',
                paymentStatus: 'completed',
                accessCodeUsed: false,
                test: {
                    ...mockTest,
                    canBeStarted: vi.fn().mockReturnValue(false)
                }
            };

            TestEnrollment.findOne.mockReturnValue({
                populate: vi.fn().mockResolvedValue(validEnrollment)
            });

            // Act & Assert
            await expect(testEnrollmentService.validateAccessCode(
                'ABC123DEF',
                mockStudent._id
            )).rejects.toThrow('Test is not currently available');
        });

    });

    describe('getTestEnrollments - Enrollment Listing', () => {
        it('should get test enrollments successfully', async () => {
            // Arrange
            const mockEnrollments = [mockEnrollment];
            const mockTotal = 1;

            Test.findOne.mockResolvedValue(mockTest);
            TestEnrollment.find.mockReturnValue({
                populate: vi.fn().mockReturnValue({
                    sort: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                            skip: vi.fn().mockResolvedValue(mockEnrollments)
                        })
                    })
                })
            });
            TestEnrollment.countDocuments.mockResolvedValue(mockTotal);
            TestEnrollment.aggregate.mockResolvedValue([]);

            // Act
            const result = await testEnrollmentService.getTestEnrollments(
                mockTest._id,
                mockOwner._id,
                { page: 1, limit: 20 }
            );

            // Assert
            expect(Test.findOne).toHaveBeenCalledWith({
                _id: mockTest._id,
                testCenterOwner: mockOwner._id
            });
            expect(result.enrollments).toBe(mockEnrollments);
            expect(result.pagination).toEqual({
                page: 1,
                limit: 20,
                total: mockTotal,
                pages: 1
            });
            expect(result.statistics).toBeDefined();
        });

        it('should throw error when test not found', async () => {
            // Arrange
            Test.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(testEnrollmentService.getTestEnrollments(
                mockTest._id,
                mockOwner._id
            )).rejects.toThrow('Test not found');
        });

        it('should handle search functionality', async () => {
            // Arrange
            Test.findOne.mockResolvedValue(mockTest);
            User.find.mockReturnValue({
                select: vi.fn().mockResolvedValue([mockStudent])
            });
            TestEnrollment.find.mockReturnValue({
                populate: vi.fn().mockReturnValue({
                    sort: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                            skip: vi.fn().mockResolvedValue([])
                        })
                    })
                })
            });
            TestEnrollment.countDocuments.mockResolvedValue(0);
            TestEnrollment.aggregate.mockResolvedValue([]);

            // Act
            const result = await testEnrollmentService.getTestEnrollments(
                mockTest._id,
                mockOwner._id,
                { search: 'john' }
            );

            // Assert
            expect(User.find).toHaveBeenCalledWith({
                $or: [
                    { firstName: /john/i },
                    { lastName: /john/i },
                    { email: /john/i },
                    { studentRegNumber: /john/i }
                ]
            });
            expect(result.enrollments).toEqual([]);
        });

        it('should handle database errors during listing', async () => {
            // Arrange
            Test.findOne.mockRejectedValue(new Error('Database connection lost'));

            // Act & Assert
            await expect(testEnrollmentService.getTestEnrollments(
                mockTest._id,
                mockOwner._id
            )).rejects.toThrow('Database connection lost');
        });
    });

    describe('cancelEnrollment - Enrollment Cancellation', () => {
        it('should cancel enrollment successfully with refund', async () => {
            // Arrange
            const paidEnrollment = {
                ...mockEnrollment,
                paymentStatus: 'completed',
                paymentAmount: 100,
                transactionId: 'TXN_123456'
            };

            TestEnrollment.findById.mockResolvedValue(paidEnrollment);
            Test.findById.mockResolvedValue(mockTest); // Mock test for ownership validation
            paymentService.processRefund.mockResolvedValue({
                refundId: 'REF_123456',
                status: 'completed'
            });

            // Act
            const result = await testEnrollmentService.cancelEnrollment(
                mockEnrollment._id,
                'Student request',
                mockOwner._id // Use test center owner ID
            );

            // Assert
            expect(TestEnrollment.findById).toHaveBeenCalledWith(mockEnrollment._id);
            expect(paymentService.processRefund).toHaveBeenCalledWith(
                'TXN_123456',
                100,
                'Student request'
            );
            expect(paidEnrollment.cancel).toHaveBeenCalledWith('Student request');
            expect(result.enrollment).toBe(paidEnrollment);
            expect(result.refundData).toBeDefined();
        });

        it('should cancel enrollment successfully without refund', async () => {
            // Arrange
            const freeEnrollment = {
                ...mockEnrollment,
                paymentStatus: 'pending',
                paymentAmount: 0
            };

            TestEnrollment.findById.mockResolvedValue(freeEnrollment);
            Test.findById.mockResolvedValue(mockTest); // Mock test for ownership validation

            // Act
            const result = await testEnrollmentService.cancelEnrollment(
                mockEnrollment._id,
                'Test cancelled',
                mockOwner._id
            );

            // Assert
            expect(paymentService.processRefund).not.toHaveBeenCalled();
            expect(result.refundData).toBeNull();
        });

        it('should throw error when enrollment not found', async () => {
            // Arrange
            TestEnrollment.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(testEnrollmentService.cancelEnrollment(
                mockEnrollment._id,
                'Reason',
                mockStudent._id
            )).rejects.toThrow('Enrollment not found');
        });

        it('should throw error when enrollment already cancelled', async () => {
            // Arrange
            const cancelledEnrollment = {
                ...mockEnrollment,
                enrollmentStatus: 'cancelled'
            };

            TestEnrollment.findById.mockResolvedValue(cancelledEnrollment);

            // Act & Assert
            await expect(testEnrollmentService.cancelEnrollment(
                mockEnrollment._id,
                'Reason',
                mockStudent._id
            )).rejects.toThrow('Enrollment is already cancelled');
        });

        it('should throw error when non-owner tries to cancel enrollment', async () => {
            // Arrange
            const activeEnrollment = {
                ...mockEnrollment,
                enrollmentStatus: 'enrolled'
            };

            TestEnrollment.findById.mockResolvedValue(activeEnrollment);
            Test.findById.mockResolvedValue(mockTest);

            // Act & Assert
            await expect(testEnrollmentService.cancelEnrollment(
                mockEnrollment._id,
                'Unauthorized cancellation',
                mockStudent._id // Student trying to cancel (not the owner)
            )).rejects.toThrow('Only test center owners can cancel enrollments');
        });

        it('should handle database errors during cancellation', async () => {
            // Arrange
            TestEnrollment.findById.mockRejectedValue(new Error('Database timeout'));

            // Act & Assert
            await expect(testEnrollmentService.cancelEnrollment(
                mockEnrollment._id,
                'Reason',
                mockStudent._id
            )).rejects.toThrow('Database timeout');
        });
    });

    describe('getEnrollmentStatistics - Statistics Generation', () => {
        it('should get enrollment statistics successfully', async () => {
            // Arrange
            const mockStats = [
                {
                    _id: { enrollmentStatus: 'enrolled', paymentStatus: 'completed' },
                    count: 5,
                    totalAmount: 500
                },
                {
                    _id: { enrollmentStatus: 'payment_pending', paymentStatus: 'pending' },
                    count: 2,
                    totalAmount: 200
                }
            ];

            TestEnrollment.aggregate.mockResolvedValue(mockStats);

            // Act
            const result = await testEnrollmentService.getEnrollmentStatistics(mockTest._id);

            // Assert
            expect(TestEnrollment.aggregate).toHaveBeenCalledWith([
                { $match: { test: mockTest._id } },
                {
                    $group: {
                        _id: {
                            enrollmentStatus: '$enrollmentStatus',
                            paymentStatus: '$paymentStatus'
                        },
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$paymentAmount' }
                    }
                }
            ]);

            expect(result.totalEnrollments).toBe(7);
            expect(result.activeEnrollments).toBe(5);
            expect(result.pendingPayments).toBe(2);
            expect(result.totalRevenue).toBe(500);
        });

        it('should return empty statistics on error', async () => {
            // Arrange
            TestEnrollment.aggregate.mockRejectedValue(new Error('Aggregation failed'));

            // Act
            const result = await testEnrollmentService.getEnrollmentStatistics(mockTest._id);

            // Assert
            expect(result).toEqual({
                totalEnrollments: 0,
                activeEnrollments: 0,
                pendingPayments: 0,
                totalRevenue: 0,
                statusBreakdown: {}
            });
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle concurrent enrollment attempts gracefully', async () => {
            // Arrange
            Test.findById.mockResolvedValue(mockTest);
            User.findById.mockResolvedValue(mockStudent);
            TestEnrollment.countDocuments.mockResolvedValue(49); // Just under limit
            TestEnrollment.findOne.mockResolvedValue(null);

            const enrollments = [
                testEnrollmentService.enrollStudent(mockTest._id, mockStudent._id),
                testEnrollmentService.enrollStudent(mockTest._id, new ObjectId())
            ];

            // Mock one succeeding and one potentially failing
            TestEnrollment.mockImplementationOnce(() => mockEnrollment);
            TestEnrollment.mockImplementationOnce(() => {
                throw new Error('Duplicate enrollment');
            });

            // Act & Assert
            const results = await Promise.allSettled(enrollments);
            expect(results).toHaveLength(2);
        });

        it('should handle payment webhook processing', async () => {
            // Arrange
            const webhookData = {
                event: 'payment.completed',
                transactionId: 'TXN_123456',
                signature: 'valid_signature'
            };

            paymentService.handleWebhook.mockResolvedValue({
                event: 'payment.completed',
                transactionId: 'TXN_123456'
            });

            TestEnrollment.findOne.mockResolvedValue({
                ...mockEnrollment,
                paymentStatus: 'pending'
            });

            // Act
            const result = await testEnrollmentService.handlePaymentWebhook(webhookData);

            // Assert
            expect(paymentService.handleWebhook).toHaveBeenCalledWith(
                webhookData,
                'valid_signature'
            );
            expect(result.event).toBe('payment.completed');
        });

        it('should handle access code generation failures gracefully', async () => {
            // Arrange
            Test.findById.mockResolvedValue(mockTest);
            User.findById.mockResolvedValue(mockStudent);
            TestEnrollment.countDocuments.mockResolvedValue(5);
            TestEnrollment.findOne
                .mockResolvedValueOnce(null) // No existing enrollment
                .mockResolvedValueOnce(mockEnrollment) // First generated code exists
                .mockResolvedValueOnce(mockEnrollment) // Second generated code exists  
                .mockResolvedValueOnce(null); // Third attempt succeeds

            TestEnrollment.mockImplementation(() => mockEnrollment);

            paymentService.initializePayment.mockResolvedValue({
                transactionId: 'TXN_123456',
                paymentUrl: 'https://payment.example.com/pay/123456',
                status: 'pending'
            });

            // Act & Assert - Should eventually succeed after retries
            await expect(testEnrollmentService.enrollStudent(mockTest._id, mockStudent._id))
                .resolves.toBeDefined();
        });

        it('should handle network timeout errors during payment processing', async () => {
            // Arrange
            TestEnrollment.findById.mockResolvedValue(mockEnrollment);
            paymentService.verifyPayment.mockRejectedValue(new Error('Network timeout'));

            // Act & Assert
            await expect(testEnrollmentService.processPayment(mockEnrollment._id, {}))
                .rejects.toThrow('Network timeout');
        });

        it('should validate enrollment access correctly', async () => {
            // Arrange
            const enrollment = {
                ...mockEnrollment,
                student: mockStudent._id
            };

            TestEnrollment.findById.mockResolvedValue(enrollment);

            // Act
            const result = await testEnrollmentService.validateEnrollmentAccess(
                mockEnrollment._id,
                mockStudent._id,
                'student'
            );

            // Assert
            expect(result).toBe(enrollment);
        });

        it('should deny access to other students enrollments', async () => {
            // Arrange
            const enrollment = {
                ...mockEnrollment,
                student: mockStudent._id
            };

            TestEnrollment.findById.mockResolvedValue(enrollment);

            // Act & Assert
            await expect(testEnrollmentService.validateEnrollmentAccess(
                mockEnrollment._id,
                new ObjectId(),
                'student'
            )).rejects.toThrow('Access denied to this enrollment');
        });
    });
});
