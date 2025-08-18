import { Test, Question, Subject, User } from '../../models/index.js';
import { subscriptionService } from '../subscriptions/service.js';
import { logger } from '../../config/logger.js';

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
            }            // Validate subjects exist and belong to the owner
            if (testData.subjects && testData.subjects.length > 0) {
                const subjects = await Subject.find({
                    _id: { $in: testData.subjects },
                    testCenterOwner: ownerId,
                    isActive: true
                });

                if (subjects.length !== testData.subjects.length) {
                    throw new Error('One or more subjects are invalid or do not belong to this test center');
                }
            }

            // Create test with proper ownership
            const test = new Test({
                ...testData,
                testCenterOwner: ownerId,
                createdBy: createdBy,
                status: 'draft'
            });

            await test.save();

            // Populate related fields for response
            await test.populate([
                { path: 'createdBy', select: 'firstName lastName email' },
                { path: 'subjects', select: 'name code color' }
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
                ...(subject && { subjects: subject })
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
                { path: 'subjects', select: 'name code color' },
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

            // Validate subjects if being updated
            if (updateData.subjects) {
                const subjects = await Subject.find({
                    _id: { $in: updateData.subjects },
                    testCenterOwner: ownerId,
                    isActive: true
                });

                if (subjects.length !== updateData.subjects.length) {
                    throw new Error('One or more subjects are invalid');
                }
            }

            // Update test
            Object.assign(test, updateData);
            await test.save();

            // Populate and return updated test
            await test.populate([
                { path: 'createdBy', select: 'firstName lastName email' },
                { path: 'subjects', select: 'name code color' }
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
}

// Create singleton instance
const testService = new TestService();

export { testService };
