import { TestEnrollment, Test, User } from '../../models/index.js';
import { paymentService } from '../payment/service.js';
import { subscriptionService } from '../subscriptions/service.js';
import { logger } from '../../config/logger.js';
import crypto from 'crypto';

class TestEnrollmentService {
    constructor() {
        this.logger = logger;
    }

    // Enroll student for test
    async enrollStudent(testId, studentId, enrollmentData = {}) {
        this.logger.info(`Enrolling student ${studentId} for test ${testId}`);

        try {
            // Validate test exists and is available for enrollment
            const test = await Test.findById(testId);
            if (!test) {
                throw new Error('Test not found');
            }

            if (!test.enrollmentConfig.isEnrollmentRequired) {
                throw new Error('This test does not require enrollment');
            }

            // Check enrollment deadline
            if (test.enrollmentConfig.enrollmentDeadline) {
                const now = new Date();
                if (now > test.enrollmentConfig.enrollmentDeadline && !test.enrollmentConfig.allowLateEnrollment) {
                    throw new Error('Enrollment deadline has passed');
                }
            }

            // Check maximum enrollments
            if (test.enrollmentConfig.maxEnrollments > 0) {
                const currentEnrollments = await TestEnrollment.countDocuments({
                    test: testId,
                    enrollmentStatus: { $in: ['enrolled', 'payment_pending'] }
                });

                if (currentEnrollments >= test.enrollmentConfig.maxEnrollments) {
                    throw new Error('Maximum enrollment limit reached');
                }
            }

            // Validate student
            const student = await User.findById(studentId);
            if (!student || student.role !== 'student') {
                throw new Error('Valid student account required');
            }

            // Check for existing enrollment
            const existingEnrollment = await TestEnrollment.findOne({
                test: testId,
                student: studentId
            });

            if (existingEnrollment) {
                if (existingEnrollment.enrollmentStatus === 'enrolled') {
                    throw new Error('Student is already enrolled for this test');
                }
                if (existingEnrollment.enrollmentStatus === 'payment_pending') {
                    throw new Error('Student has pending enrollment payment');
                }
            }

            // Generate unique access code
            const accessCode = await this.generateUniqueAccessCode();

            // Determine payment amount
            const paymentAmount = test.enrollmentConfig.enrollmentFee || 0;

            // Create enrollment
            const enrollment = new TestEnrollment({
                test: testId,
                student: studentId,
                testCenterOwner: test.testCenterOwner,
                accessCode,
                paymentAmount,
                enrollmentStatus: paymentAmount > 0 ? 'payment_pending' : 'enrolled',
                paymentStatus: paymentAmount > 0 ? 'pending' : 'completed',
                paymentMethod: paymentAmount > 0 ? null : 'free',
                enrollmentNotes: enrollmentData.notes,
                expiresAt: enrollmentData.expiresAt
            });

            await enrollment.save();

            // Initialize payment if required
            let paymentData = null;
            if (paymentAmount > 0 && test.enrollmentConfig.requirePayment) {
                paymentData = await paymentService.initializePayment(
                    paymentAmount,
                    'USD',
                    {
                        enrollmentId: enrollment._id,
                        testId,
                        studentId,
                        type: 'test_enrollment'
                    }
                );

                // Update enrollment with payment reference
                enrollment.transactionId = paymentData.transactionId;
                enrollment.paymentReference = paymentData.transactionId;
                await enrollment.save();
            }

            // Populate enrollment data for response
            await enrollment.populate([
                { path: 'test', select: 'title description duration enrollmentConfig' },
                { path: 'student', select: 'firstName lastName email studentRegNumber' }
            ]);

            // Update test enrollment statistics
            await this.updateTestEnrollmentStats(testId);

            this.logger.info(`Student enrollment created: ${enrollment._id}`);

            return {
                enrollment,
                paymentData
            };

        } catch (error) {
            this.logger.error('Failed to enroll student:', error);
            throw error;
        }
    }

    // Process payment and update enrollment
    async processPayment(enrollmentId, paymentDetails) {
        this.logger.info(`Processing payment for enrollment: ${enrollmentId}`);

        try {
            const enrollment = await TestEnrollment.findById(enrollmentId);
            if (!enrollment) {
                throw new Error('Enrollment not found');
            }

            if (enrollment.paymentStatus === 'completed') {
                throw new Error('Payment already completed');
            }

            // Verify payment with payment service
            const verificationResult = await paymentService.verifyPayment(
                paymentDetails.transactionId || enrollment.transactionId
            );

            if (verificationResult.status === 'completed') {
                // Mark payment as completed
                await enrollment.markPaymentCompleted(
                    verificationResult.transactionId,
                    paymentDetails.paymentMethod || verificationResult.paymentMethod
                );

                // Update test statistics
                await this.updateTestEnrollmentStats(enrollment.test);

                this.logger.info(`Payment completed for enrollment: ${enrollmentId}`);

                // Populate and return updated enrollment
                await enrollment.populate([
                    { path: 'test', select: 'title description' },
                    { path: 'student', select: 'firstName lastName email' }
                ]);

                return enrollment;
            } else {
                // Update payment status to failed
                enrollment.paymentStatus = 'failed';
                await enrollment.save();
                throw new Error('Payment verification failed');
            }

        } catch (error) {
            this.logger.error('Failed to process payment:', error);
            throw error;
        }
    }

    // Generate unique access code
    async generateUniqueAccessCode() {
        let accessCode;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUnique && attempts < maxAttempts) {
            accessCode = crypto.randomBytes(6).toString('hex').toUpperCase();
            const existing = await TestEnrollment.findOne({ accessCode });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            throw new Error('Failed to generate unique access code');
        }

        return accessCode;
    }

    // Validate access code for test taking
    async validateAccessCode(accessCode, studentId, testId = null) {
        this.logger.info(`Validating access code: ${accessCode}`);

        try {
            const query = {
                accessCode: accessCode.toUpperCase(),
                student: studentId
            };

            if (testId) {
                query.test = testId;
            }

            const enrollment = await TestEnrollment.findOne(query)
                .populate([
                    { path: 'test', select: 'title description duration schedule status enrollmentConfig' },
                    { path: 'student', select: 'firstName lastName email' }
                ]);

            if (!enrollment) {
                throw new Error('Invalid access code or unauthorized access');
            }

            // Check enrollment status
            if (enrollment.enrollmentStatus !== 'enrolled') {
                throw new Error('Enrollment is not active');
            }

            if (enrollment.paymentStatus !== 'completed') {
                throw new Error('Payment required to access test');
            }

            // Check if access code is already used
            if (enrollment.accessCodeUsed) {
                throw new Error('Access code has already been used');
            }

            // Check test availability
            if (!enrollment.test.canBeStarted()) {
                throw new Error('Test is not currently available');
            }

            // Check expiry
            if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
                throw new Error('Enrollment has expired');
            }

            this.logger.info(`Access code validated successfully: ${accessCode}`);
            return enrollment;

        } catch (error) {
            this.logger.error('Access code validation failed:', error);
            throw error;
        }
    }

    // Get enrollments for test (admin view)
    async getTestEnrollments(testId, ownerId, options = {}) {
        this.logger.info(`Getting enrollments for test: ${testId}`);

        try {
            // Verify test ownership
            const test = await Test.findOne({
                _id: testId,
                testCenterOwner: ownerId
            });

            if (!test) {
                throw new Error('Test not found or access denied');
            }

            const {
                page = 1,
                limit = 20,
                enrollmentStatus,
                paymentStatus,
                search
            } = options;

            const skip = (page - 1) * limit;
            const query = { test: testId };

            if (enrollmentStatus) query.enrollmentStatus = enrollmentStatus;
            if (paymentStatus) query.paymentStatus = paymentStatus;

            // Add search functionality
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                const students = await User.find({
                    $or: [
                        { firstName: searchRegex },
                        { lastName: searchRegex },
                        { email: searchRegex },
                        { studentRegNumber: searchRegex }
                    ]
                }).select('_id');

                if (students.length > 0) {
                    query.student = { $in: students.map(s => s._id) };
                } else {
                    // No students found matching search
                    return {
                        enrollments: [],
                        pagination: {
                            page: parseInt(page),
                            limit: parseInt(limit),
                            total: 0,
                            pages: 0
                        },
                        statistics: await this.getEnrollmentStatistics(testId)
                    };
                }
            }

            const [enrollments, total] = await Promise.all([
                TestEnrollment.find(query)
                    .populate('student', 'firstName lastName email studentRegNumber')
                    .sort({ createdAt: -1 })
                    .limit(parseInt(limit))
                    .skip(parseInt(skip)),
                TestEnrollment.countDocuments(query)
            ]);

            const statistics = await this.getEnrollmentStatistics(testId);

            return {
                enrollments,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                },
                statistics
            };

        } catch (error) {
            this.logger.error('Failed to get test enrollments:', error);
            throw error;
        }
    }

    // Get student's enrollments
    async getStudentEnrollments(studentId, options = {}) {
        this.logger.info(`Getting enrollments for student: ${studentId}`);

        try {
            const {
                page = 1,
                limit = 10,
                enrollmentStatus,
                paymentStatus
            } = options;

            const skip = (page - 1) * limit;
            const query = { student: studentId };

            if (enrollmentStatus) query.enrollmentStatus = enrollmentStatus;
            if (paymentStatus) query.paymentStatus = paymentStatus;

            const [enrollments, total] = await Promise.all([
                TestEnrollment.find(query)
                    .populate('test', 'title description duration enrollmentConfig schedule')
                    .sort({ createdAt: -1 })
                    .limit(parseInt(limit))
                    .skip(parseInt(skip)),
                TestEnrollment.countDocuments(query)
            ]);

            return {
                enrollments,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            this.logger.error('Failed to get student enrollments:', error);
            throw error;
        }
    }

    // Cancel enrollment
    async cancelEnrollment(enrollmentId, reason, cancelledBy) {
        this.logger.info(`Cancelling enrollment: ${enrollmentId}`);

        try {
            const enrollment = await TestEnrollment.findById(enrollmentId);
            if (!enrollment) {
                throw new Error('Enrollment not found');
            }

            if (enrollment.enrollmentStatus === 'cancelled') {
                throw new Error('Enrollment is already cancelled');
            }

            // Process refund if payment was completed
            let refundData = null;
            if (enrollment.paymentStatus === 'completed' && enrollment.paymentAmount > 0) {
                refundData = await paymentService.processRefund(
                    enrollment.transactionId,
                    enrollment.paymentAmount,
                    reason
                );

                enrollment.paymentStatus = 'refunded';
            }

            // Cancel the enrollment
            await enrollment.cancel(reason);

            // Update test statistics
            await this.updateTestEnrollmentStats(enrollment.test);

            this.logger.info(`Enrollment cancelled: ${enrollmentId}`);

            return { enrollment, refundData };

        } catch (error) {
            this.logger.error('Failed to cancel enrollment:', error);
            throw error;
        }
    }

    // Handle payment webhook
    async handlePaymentWebhook(webhookData) {
        this.logger.info('Processing enrollment payment webhook');

        try {
            const processedWebhook = await paymentService.handleWebhook(
                webhookData,
                webhookData.signature
            );

            if (processedWebhook.event === 'payment.completed') {
                const enrollment = await TestEnrollment.findOne({
                    transactionId: processedWebhook.transactionId
                });

                if (enrollment && enrollment.paymentStatus === 'pending') {
                    await enrollment.markPaymentCompleted(
                        processedWebhook.transactionId,
                        'webhook'
                    );

                    await this.updateTestEnrollmentStats(enrollment.test);
                }
            }

            return processedWebhook;

        } catch (error) {
            this.logger.error('Failed to process payment webhook:', error);
            throw error;
        }
    }

    // Get enrollment statistics for a test
    async getEnrollmentStatistics(testId) {
        try {
            const stats = await TestEnrollment.aggregate([
                { $match: { test: testId } },
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

            const summary = {
                totalEnrollments: 0,
                activeEnrollments: 0,
                pendingPayments: 0,
                totalRevenue: 0,
                statusBreakdown: {}
            };

            stats.forEach(stat => {
                const key = `${stat._id.enrollmentStatus}_${stat._id.paymentStatus}`;
                summary.statusBreakdown[key] = {
                    count: stat.count,
                    amount: stat.totalAmount
                };

                summary.totalEnrollments += stat.count;

                if (stat._id.enrollmentStatus === 'enrolled' && stat._id.paymentStatus === 'completed') {
                    summary.activeEnrollments += stat.count;
                    summary.totalRevenue += stat.totalAmount;
                }

                if (stat._id.paymentStatus === 'pending') {
                    summary.pendingPayments += stat.count;
                }
            });

            return summary;

        } catch (error) {
            this.logger.error('Failed to get enrollment statistics:', error);
            return {
                totalEnrollments: 0,
                activeEnrollments: 0,
                pendingPayments: 0,
                totalRevenue: 0,
                statusBreakdown: {}
            };
        }
    }

    // Update test enrollment statistics
    async updateTestEnrollmentStats(testId) {
        try {
            const stats = await this.getEnrollmentStatistics(testId);

            await Test.findByIdAndUpdate(testId, {
                'enrollmentStats.totalEnrolled': stats.activeEnrollments,
                'enrollmentStats.pendingPayments': stats.pendingPayments,
                'enrollmentStats.totalRevenue': stats.totalRevenue,
                'enrollmentStats.paidEnrollments': stats.activeEnrollments
            });

        } catch (error) {
            this.logger.error('Failed to update test enrollment stats:', error);
        }
    }

    // Mark access code as used
    async markAccessCodeUsed(enrollmentId) {
        try {
            const enrollment = await TestEnrollment.findById(enrollmentId);
            if (enrollment && !enrollment.accessCodeUsed) {
                enrollment.accessCodeUsed = true;
                enrollment.accessCodeUsedAt = new Date();
                await enrollment.save();
            }
            return enrollment;
        } catch (error) {
            this.logger.error('Failed to mark access code as used:', error);
            throw error;
        }
    }

    // Validate enrollment access for operations
    async validateEnrollmentAccess(enrollmentId, userId, userRole) {
        const enrollment = await TestEnrollment.findById(enrollmentId);
        if (!enrollment) {
            throw new Error('Enrollment not found');
        }

        // Students can only access their own enrollments
        if (userRole === 'student' && enrollment.student.toString() !== userId.toString()) {
            throw new Error('Access denied to this enrollment');
        }

        // Test center owners and creators can access enrollments for their tests
        if (['test_center_owner', 'test_creator'].includes(userRole)) {
            const test = await Test.findById(enrollment.test);
            const ownerId = userRole === 'test_center_owner' ? userId : test?.testCenterOwner;

            if (!test || test.testCenterOwner.toString() !== ownerId.toString()) {
                throw new Error('Access denied to this enrollment');
            }
        }

        return enrollment;
    }
}

// Create singleton instance
const testEnrollmentService = new TestEnrollmentService();

export { testEnrollmentService };
