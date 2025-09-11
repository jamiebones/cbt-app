import { Test, Question, Subject, User, TestEnrollment } from '../../models/index.js';
import { subscriptionService } from '../subscriptions/service.js';
import { logger } from '../../config/logger.js';
import mongoose from 'mongoose';

class TestService {
    constructor() {
        this.logger = logger;
    }

    // Create a new test with subscription validation
    async createTest(testData, ownerId, createdBy) {
        this.logger.info(`Creating test for owner: ${ownerId}`);

        try {
            // Validate subscription limits
            const validation = await subscriptionService.validateAction(createdBy, 'createTest');
            if (!validation.allowed) {
                throw new Error(validation.message);
            }

            // Validate owner relationship
            const creator = await User.findById(createdBy);
            if (!creator) {
                throw new Error('Creator not found');
            }

            // Ensure the creator belongs to the test center or is the owner
            let validOwnerRelation = false;

            if (creator.role === 'test_center_owner') {
                validOwnerRelation = creator._id.toString() === ownerId.toString();
            } else if (creator.role === 'test_creator') {
                validOwnerRelation = creator.testCenterOwner &&
                    creator.testCenterOwner.toString() === ownerId.toString();
            }

            if (!validOwnerRelation) {
                throw new Error('User does not have permission to create tests for this test center');
            }

            // Validate subject exists and belongs to the owner
            if (testData.subject) {
                const subject = await Subject.findOne({
                    _id: testData.subject,
                    testCenterOwner: ownerId,
                    isActive: true
                });

                if (!subject) {
                    throw new Error('Subject is invalid or does not belong to this test center');
                }
            }

            // Create test with proper ownership
            const test = new Test({
                ...testData,
                testCenterOwner: ownerId,
                createdBy: createdBy,
                status: 'draft',
                enrollmentConfig: testData.enrollmentConfig || {
                    isEnrollmentRequired: false,
                    enrollmentFee: 0,
                    maxEnrollments: -1,
                    allowLateEnrollment: false,
                    requirePayment: false,
                    autoApprove: true
                }
            });

            await test.save();

            // Populate related fields for response
            await test.populate([
                { path: 'createdBy', select: 'firstName lastName email' },
                { path: 'subject', select: 'name code color' }
            ]);

            this.logger.info(`Test created successfully: ${test._id}`);
            return test;

        } catch (error) {
            this.logger.error('Failed to create test:', error);
            throw error;
        }
    }

    // Get tests by owner with filtering and pagination
    async getTestsByOwner(ownerId, options = {}) {
        this.logger.info(`Getting tests for owner: ${ownerId}`);

        try {
            const {
                page = 1,
                limit = 20,
                status,
                search,
                subject,
                sort = 'createdAt'
            } = options;

            const skip = (page - 1) * limit;

            const tests = await Test.findByOwner(ownerId, {
                status,
                search,
                subject,
                sort: { [sort]: -1 },
                limit: parseInt(limit),
                skip: parseInt(skip)
            });

            const total = await Test.countDocuments({
                testCenterOwner: ownerId,
                ...(status && { status }),
                ...(subject && { subject: subject })
            });

            return {
                tests,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            this.logger.error('Failed to get tests:', error);
            throw error;
        }
    }

    // Get single test by ID with validation
    async getTestById(testId, ownerId) {
        this.logger.info(`Getting test: ${testId} for owner: ${ownerId}`);

        try {
            const test = await Test.findOne({
                _id: testId,
                testCenterOwner: ownerId
            }).populate([
                { path: 'createdBy', select: 'firstName lastName email' },
                { path: 'subject', select: 'name code color' },
                { path: 'questions', select: 'questionText type difficulty points' }
            ]);

            if (!test) {
                throw new Error('Test not found or access denied');
            }

            return test;

        } catch (error) {
            this.logger.error('Failed to get test:', error);
            throw error;
        }
    }

    // Update test with validation
    async updateTest(testId, updateData, ownerId, userId) {
        this.logger.info(`Updating test: ${testId}`);

        try {
            const test = await Test.findOne({
                _id: testId,
                testCenterOwner: ownerId
            });

            if (!test) {
                throw new Error('Test not found or access denied');
            }

            // Validate that active tests cannot be modified significantly
            if (test.status === 'active' || test.status === 'completed') {
                const restrictedFields = ['totalQuestions', 'duration', 'questions', 'questionSelectionMethod'];
                const hasRestrictedUpdates = restrictedFields.some(field =>
                    updateData.hasOwnProperty(field)
                );

                if (hasRestrictedUpdates) {
                    throw new Error('Cannot modify core test settings for active or completed tests');
                }
            }

            // Validate subject if being updated
            if (updateData.subject) {
                const subject = await Subject.findOne({
                    _id: updateData.subject,
                    testCenterOwner: ownerId,
                    isActive: true
                });

                if (!subject) {
                    throw new Error('Subject is invalid or does not belong to this test center');
                }
            }

            // Update test
            Object.assign(test, updateData);
            await test.save();

            // Populate and return updated test
            await test.populate([
                { path: 'createdBy', select: 'firstName lastName email' },
                { path: 'subject', select: 'name code color' }
            ]);

            this.logger.info(`Test updated successfully: ${testId}`);
            return test;

        } catch (error) {
            this.logger.error('Failed to update test:', error);
            throw error;
        }
    }

    // Delete test with validation
    async deleteTest(testId, ownerId) {
        this.logger.info(`Deleting test: ${testId}`);

        try {
            const test = await Test.findOne({
                _id: testId,
                testCenterOwner: ownerId
            });

            if (!test) {
                throw new Error('Test not found or access denied');
            }

            // Check if test can be deleted (not active or completed with attempts)
            if (test.status === 'active') {
                throw new Error('Cannot delete active test');
            }

            if (test.status === 'completed' && test.stats.totalAttempts > 0) {
                throw new Error('Cannot delete completed test with student attempts');
            }

            await Test.findByIdAndDelete(testId);

            this.logger.info(`Test deleted successfully: ${testId}`);
            return { success: true, message: 'Test deleted successfully' };

        } catch (error) {
            this.logger.error('Failed to delete test:', error);
            throw error;
        }
    }

    // Add question to test
    async addQuestionToTest(testId, questionData, ownerId, createdBy) {
        this.logger.info(`Adding question to test: ${testId}`);

        try {
            const test = await Test.findOne({
                _id: testId,
                testCenterOwner: ownerId
            });

            if (!test) {
                throw new Error('Test not found or access denied');
            }

            // Check if test allows modifications
            if (['active', 'completed'].includes(test.status)) {
                throw new Error('Cannot modify questions in active or completed tests');
            }

            // Validate subscription limits for questions
            const currentQuestionCount = test.questions.length;
            const validation = await subscriptionService.validateAction(
                createdBy,
                'addQuestionToTest',
                { currentQuestionsInTest: currentQuestionCount }
            );

            if (!validation.allowed) {
                throw new Error(validation.message);
            }

            // Create the question
            const question = new Question({
                ...questionData,
                testCenterOwner: ownerId,
                createdBy: createdBy
            });

            await question.save();

            // Add question to test
            test.questions.push(question._id);
            await test.save();

            // Populate question for response
            await question.populate([
                { path: 'subject', select: 'name code color' },
                { path: 'createdBy', select: 'firstName lastName' }
            ]);

            this.logger.info(`Question added to test successfully: ${question._id}`);
            return question;

        } catch (error) {
            this.logger.error('Failed to add question to test:', error);
            throw error;
        }
    }

    // Get questions for a specific test
    async getTestQuestions(testId, ownerId) {
        this.logger.info(`Getting questions for test: ${testId}`);

        try {
            const test = await Test.findOne({
                _id: testId,
                testCenterOwner: ownerId
            }).populate([
                {
                    path: 'questions',
                    populate: [
                        { path: 'subject', select: 'name code color' },
                        { path: 'createdBy', select: 'firstName lastName' }
                    ]
                }
            ]);

            if (!test) {
                throw new Error('Test not found or access denied');
            }

            return test.questions;

        } catch (error) {
            this.logger.error('Failed to get test questions:', error);
            throw error;
        }
    }

    // Helper method to count tests for subscription service
    async countUserTests(ownerId) {
        try {
            return await Test.countDocuments({
                testCenterOwner: ownerId,
                status: { $ne: 'archived' }
            });
        } catch (error) {
            this.logger.error('Failed to count tests:', error);
            return 0;
        }
    }

    // Helper method to count questions for subscription service
    async countQuestions(ownerId) {
        try {
            return await Question.countDocuments({
                testCenterOwner: ownerId,
                isActive: true
            });
        } catch (error) {
            this.logger.error('Failed to count questions:', error);
            return 0;
        }
    }

    // Get test with enrollment information
    async getTestWithEnrollmentInfo(testId, ownerId) {
        this.logger.info(`Getting test with enrollment info: ${testId}`);

        try {
            const test = await Test.findOne({
                _id: testId,
                testCenterOwner: ownerId
            }).populate([
                { path: 'subject', select: 'name code color' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ]);

            if (!test) {
                throw new Error('Test not found or access denied');
            }

            // Get enrollment statistics if enrollment is enabled
            let enrollmentStats = null;
            if (test.enrollmentConfig.isEnrollmentRequired) {
                enrollmentStats = await TestEnrollment.aggregate([
                    { $match: { test: testId } },
                    {
                        $group: {
                            _id: '$enrollmentStatus',
                            count: { $sum: 1 },
                            revenue: { $sum: '$paymentAmount' }
                        }
                    }
                ]);
            }

            return {
                test,
                enrollmentStats
            };

        } catch (error) {
            this.logger.error('Failed to get test with enrollment info:', error);
            throw error;
        }
    }

    // Update enrollment configuration
    async updateEnrollmentConfig(testId, ownerId, enrollmentConfig) {
        this.logger.info(`Updating enrollment config for test: ${testId}`);

        try {
            const test = await Test.findOne({
                _id: testId,
                testCenterOwner: ownerId
            });

            if (!test) {
                throw new Error('Test not found or access denied');
            }

            // Prevent changes if test is active or has enrollments
            if (['active', 'completed'].includes(test.status)) {
                throw new Error('Cannot modify enrollment config for active or completed tests');
            }

            const hasEnrollments = await TestEnrollment.countDocuments({ test: testId });
            if (hasEnrollments > 0) {
                throw new Error('Cannot modify enrollment config when students are already enrolled');
            }

            // Update enrollment configuration
            test.enrollmentConfig = {
                ...test.enrollmentConfig,
                ...enrollmentConfig
            };

            // Set requirePayment based on enrollmentFee
            if (enrollmentConfig.enrollmentFee !== undefined) {
                test.enrollmentConfig.requirePayment = enrollmentConfig.enrollmentFee > 0;
            }

            await test.save();

            this.logger.info(`Enrollment config updated for test: ${testId}`);
            return test;

        } catch (error) {
            this.logger.error('Failed to update enrollment config:', error);
            throw error;
        }
    }

    // Bulk add existing questions manually
    async addExistingQuestions(testId, questionIds, ownerId, userId) {
        this.logger.info(`Bulk adding ${questionIds.length} questions to test ${testId}`);
        const test = await Test.findOne({ _id: testId, testCenterOwner: ownerId });
        if (!test) throw new Error('Test not found or access denied');
        if (['active', 'completed'].includes(test.status)) throw new Error('Cannot modify questions in active or completed tests');

        // Filter to questions belonging to same owner & active
        const questions = await Question.find({
            _id: { $in: questionIds },
            testCenterOwner: ownerId,
            isActive: true
        }).select('_id');

        const validIds = questions.map(q => q._id.toString());
        const existingSet = new Set(test.questions.map(id => id.toString()));
        const newIds = validIds.filter(id => !existingSet.has(id));

        if (!newIds.length) {
            return { added: 0, totalInTest: test.questions.length, addedIds: [] };
        }

        test.questions.push(...newIds.map(id => new mongoose.Types.ObjectId(id)));
        await test.save();
        return { added: newIds.length, totalInTest: test.questions.length, addedIds: newIds };
    }

    // Auto select random questions based on criteria
    async autoSelectQuestions(testId, params, ownerId) {
        const { subjects, count, difficultyDistribution } = params;
        this.logger.info(`Auto selecting ${count} questions for test ${testId}`);
        const test = await Test.findOne({ _id: testId, testCenterOwner: ownerId });
        if (!test) throw new Error('Test not found or access denied');
        if (['active', 'completed'].includes(test.status)) throw new Error('Cannot modify questions in active or completed tests');

        const excludeIds = test.questions;
        const baseMatch = {
            subject: { $in: subjects.map(id => new mongoose.Types.ObjectId(id)) },
            testCenterOwner: new mongoose.Types.ObjectId(ownerId),
            isActive: true,
            _id: { $nin: excludeIds }
        };

        // Difficulty distribution if provided and sums to 100
        if (difficultyDistribution && Object.values(difficultyDistribution).some(v => v > 0)) {
            const totalReq = count;
            const dist = difficultyDistribution;
            const segments = ['easy', 'medium', 'hard'].map(level => ({ level, pct: dist[level] || 0 }));
            const samples = [];
            for (const seg of segments) {
                if (seg.pct > 0) {
                    const size = Math.round((seg.pct / 100) * totalReq);
                    if (size > 0) {
                        samples.push({ level: seg.level, size });
                    }
                }
            }
            // Fallback if rounding dropped all
            if (!samples.length) samples.push({ level: 'medium', size: totalReq });

            const results = [];
            for (const s of samples) {
                const part = await Question.aggregate([
                    { $match: { ...baseMatch, difficulty: s.level } },
                    { $sample: { size: s.size } }
                ]);
                results.push(...part);
            }
            // If still short, fill randomly
            if (results.length < count) {
                const remaining = count - results.length;
                const fill = await Question.aggregate([
                    { $match: baseMatch },
                    { $sample: { size: remaining } }
                ]);
                results.push(...fill);
            }
            const newIds = results.map(r => r._id.toString());
            const existingSet = new Set(test.questions.map(id => id.toString()));
            const filtered = newIds.filter(id => !existingSet.has(id));
            test.questions.push(...filtered.map(id => new mongoose.Types.ObjectId(id)));
            await test.save();
            return { requested: count, added: filtered.length, totalInTest: test.questions.length, addedIds: filtered };
        }

        // Simple random sample
        const sampled = await Question.aggregate([
            { $match: baseMatch },
            { $sample: { size: count } }
        ]);
        const ids = sampled.map(q => q._id.toString());
        const existingSet = new Set(test.questions.map(id => id.toString()));
        const newIds = ids.filter(id => !existingSet.has(id));
        test.questions.push(...newIds.map(id => new mongoose.Types.ObjectId(id)));
        await test.save();
        return { requested: count, added: newIds.length, totalInTest: test.questions.length, addedIds: newIds };
    }

    // Attach imported question IDs after excel import
    async attachImportedQuestions(testId, questionIds, ownerId) {
        const test = await Test.findOne({ _id: testId, testCenterOwner: ownerId });
        if (!test) throw new Error('Test not found or access denied');
        if (!questionIds.length) return { added: 0, totalInTest: test.questions.length };
        const existingSet = new Set(test.questions.map(id => id.toString()));
        const newIds = questionIds.filter(id => !existingSet.has(id));
        if (!newIds.length) return { added: 0, totalInTest: test.questions.length };
        test.questions.push(...newIds.map(id => new mongoose.Types.ObjectId(id)));
        await test.save();
        return { added: newIds.length, totalInTest: test.questions.length, addedIds: newIds };
    }

    // Remove a single question from a test
    async removeQuestionFromTest(testId, questionId, ownerId) {
        this.logger.info(`Removing question ${questionId} from test ${testId}`);
        const test = await Test.findOne({ _id: testId, testCenterOwner: ownerId }).select('_id status questions');
        if (!test) throw new Error('Test not found or access denied');
        if (['active', 'completed'].includes(test.status)) {
            throw new Error('Cannot modify questions in active or completed tests');
        }

        const qId = new mongoose.Types.ObjectId(questionId);
        const exists = (test.questions || []).some(id => id.toString() === qId.toString());
        if (!exists) {
            return { removed: 0, totalInTest: test.questions.length, message: 'Question not in test' };
        }

        await Test.updateOne({ _id: testId }, { $pull: { questions: qId } });
        const totalInTest = Math.max(0, (test.questions?.length || 1) - 1);
        return { removed: 1, totalInTest, message: 'Question removed from test' };
    }

    // Update test status with business rules
    async updateTestStatus(testId, ownerId, newStatus) {
        this.logger.info(`Updating status for test ${testId} to ${newStatus}`);
        const allowed = {
            draft: ['published'],
            published: ['active'],
            active: ['completed'],
            completed: ['archived'],
            archived: []
        };

        const test = await Test.findOne({ _id: testId, testCenterOwner: ownerId }).select(
            'status questions totalQuestions questionSelectionMethod autoSelectionConfig schedule.startDate schedule.endDate subject'
        );
        if (!test) throw new Error('Test not found or access denied');

        const current = test.status;
        if (!allowed[current] || !allowed[current].includes(newStatus)) {
            throw new Error(`Invalid status transition from ${current} to ${newStatus}`);
        }

        // Helper validations
        const hasValidQuestions = () => {
            if (test.questions?.length < test.totalQuestions) {
                return false;
            }
            return true;
        };

        const hasValidSchedule = () => {
            const start = test.schedule?.startDate;
            const end = test.schedule?.endDate;
            return Boolean(start && end && start < end);
        };

        const nowWithinSchedule = () => {
            const now = new Date();
            const start = test.schedule?.startDate;
            const end = test.schedule?.endDate;
            return Boolean(start && end && start <= now && end >= now);
        };

        const scheduleEnded = () => {
            const now = new Date();
            const end = test.schedule?.endDate;
            return Boolean(end && end <= now);
        };

        // Validate constraints per transition
        if (current === 'draft' && newStatus === 'published') {
            if (!test.subject) throw new Error('Cannot publish: subject is not set');
            if (!hasValidSchedule()) throw new Error('Cannot publish: schedule is invalid');
            if (!hasValidQuestions()) throw new Error('Cannot publish: questions are not complete');
        }

        if (current === 'published' && newStatus === 'active') {
            if (!hasValidQuestions()) throw new Error('Cannot activate: questions are not complete');
            if (!hasValidSchedule()) throw new Error('Cannot activate: schedule is invalid');
            if (!nowWithinSchedule()) {
                throw new Error('Cannot activate: current time is outside the scheduled window');
            }
        }

        if (current === 'active' && newStatus === 'completed') {
            if (!scheduleEnded()) {
                throw new Error('Cannot complete: test has not reached its end time');
            }
        }

        test.status = newStatus;
        await test.save();
        return { success: true, status: test.status };
    }

    // List active tests for a student by their test center owner
    async listActiveTestsForOwner(ownerId) {
        try {
            const tests = await Test.findActiveTests(ownerId)
                .select('title description duration totalQuestions subject schedule status enrollmentConfig enrollmentStats createdAt')
                .lean();
            return tests;
        } catch (error) {
            this.logger.error('Failed to list active tests:', error);
            throw error;
        }
    }
}

// Create singleton instance
const testService = new TestService();

export { testService };
