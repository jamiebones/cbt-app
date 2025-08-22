import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { testService } from '../../modules/tests/service.js';

const { ObjectId } = mongoose.Types;

// Mock the models and services
vi.mock('../../models/index.js', () => ({
    Test: vi.fn(),
    Question: vi.fn(),
    Subject: vi.fn(),
    User: vi.fn()
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

import { Test, Question, Subject, User } from '../../models/index.js';
import { subscriptionService } from '../../modules/subscriptions/service.js';
import { logger } from '../../config/logger.js';

describe('TestService - Complete Coverage', () => {
    let mockOwner, mockCreator, mockSubject, mockTest, mockQuestion;

    beforeEach(() => {
        vi.clearAllMocks();

        // Set up subscription service mock  
        subscriptionService.validateAction = vi.fn();

        // Set up model static methods
        Test.findByOwner = vi.fn();
        Test.countDocuments = vi.fn();
        Test.findOne = vi.fn();
        Test.findByIdAndDelete = vi.fn();

        Question.countDocuments = vi.fn();
        Subject.findOne = vi.fn();
        User.findById = vi.fn();

        // Create mock data with ObjectIds
        mockOwner = {
            _id: new ObjectId(),
            role: 'test_center_owner',
            email: 'owner@test.com'
        };

        mockCreator = {
            _id: new ObjectId(),
            role: 'test_creator',
            testCenterOwner: mockOwner._id,
            firstName: 'John',
            lastName: 'Creator'
        };

        mockSubject = {
            _id: new ObjectId(),
            name: 'Mathematics',
            code: 'MATH',
            testCenterOwner: mockOwner._id,
            isActive: true
        };

        mockTest = {
            _id: new ObjectId(),
            title: 'Sample Test',
            description: 'Test description',
            timeLimit: 60,
            testCenterOwner: mockOwner._id,
            createdBy: mockCreator._id,
            subject: mockSubject._id,
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
            questions: [mockQuestion._id],
            isActive: true,
            enrollmentConfig: {
                isEnrollmentRequired: false,
                enrollmentFee: 0,
                maxEnrollments: null,
                requirePayment: false,
                allowLateEnrollment: true,
                autoApprove: true
            },
            enrollmentStats: {
                totalEnrollments: 0,
                activeEnrollments: 0,
                pendingPayments: 0,
                totalRevenue: 0
            },
            save: vi.fn().mockResolvedValue(true),
            remove: vi.fn().mockResolvedValue(true),
            populate: vi.fn().mockReturnThis(),
            canBeStarted: vi.fn().mockReturnValue(true),
            canBeEdited: vi.fn().mockReturnValue(true),
            updateStatistics: vi.fn().mockResolvedValue(true),
            addQuestions: vi.fn().mockResolvedValue(true),
            removeQuestions: vi.fn().mockResolvedValue(true),
            activate: vi.fn().mockResolvedValue(true),
            deactivate: vi.fn().mockResolvedValue(true)
        };

        mockQuestion = {
            _id: new ObjectId(),
            questionText: 'What is 2+2?',
            type: 'multiple_choice',
            difficulty: 'easy',
            points: 5,
            testCenterOwner: mockOwner._id,
            createdBy: mockCreator._id,
            save: vi.fn().mockResolvedValue(true),
            populate: vi.fn().mockReturnThis()
        };

        // Mock logger methods
        logger.info.mockClear();
        logger.error.mockClear();
    });

    describe('createTest - Test Creation', () => {
        it('should create test successfully as test center owner', async () => {
            // Arrange
            const testData = {
                title: 'New Test',
                description: 'Test description',
                subject: mockSubject._id,
                totalQuestions: 5,
                duration: 30
            };

            subscriptionService.validateAction.mockResolvedValue({ allowed: true });
            User.findById.mockResolvedValue(mockOwner);
            Subject.findOne.mockResolvedValue(mockSubject);

            // Mock Test constructor and save
            Test.mockImplementation(() => mockTest);

            // Act
            const result = await testService.createTest(testData, mockOwner._id, mockOwner._id);

            // Assert
            expect(subscriptionService.validateAction).toHaveBeenCalledWith(mockOwner._id, 'createTest');
            expect(User.findById).toHaveBeenCalledWith(mockOwner._id);
            expect(Subject.findOne).toHaveBeenCalledWith({
                _id: testData.subject,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(Test).toHaveBeenCalledWith({
                ...testData,
                testCenterOwner: mockOwner._id,
                createdBy: mockOwner._id,
                status: 'draft'
            });
            expect(mockTest.save).toHaveBeenCalled();
            expect(mockTest.populate).toHaveBeenCalledWith([
                { path: 'createdBy', select: 'firstName lastName email' },
                { path: 'subject', select: 'name code color' }
            ]);
            expect(result).toBe(mockTest);
        });

        it('should create test successfully as test creator', async () => {
            // Arrange
            const testData = {
                title: 'Creator Test',
                description: 'Test by creator'
            };

            subscriptionService.validateAction.mockResolvedValue({ allowed: true });
            User.findById.mockResolvedValue(mockCreator);
            Test.mockImplementation(() => mockTest);

            // Act
            const result = await testService.createTest(testData, mockOwner._id, mockCreator._id);

            // Assert
            expect(User.findById).toHaveBeenCalledWith(mockCreator._id);
            expect(result).toBe(mockTest);
        });

        it('should throw error when subscription validation fails', async () => {
            // Arrange
            const testData = { title: 'Test' };
            subscriptionService.validateAction.mockResolvedValue({
                allowed: false,
                message: 'Subscription limit exceeded'
            });

            // Act & Assert
            await expect(testService.createTest(testData, mockOwner._id, mockOwner._id))
                .rejects.toThrow('Subscription limit exceeded');
        });

        it('should throw error when creator not found', async () => {
            // Arrange
            const testData = { title: 'Test' };
            subscriptionService.validateAction.mockResolvedValue({ allowed: true });
            User.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(testService.createTest(testData, mockOwner._id, mockCreator._id))
                .rejects.toThrow('Creator not found');
        });

        it('should throw error when creator has no permission', async () => {
            // Arrange
            const testData = { title: 'Test' };
            const unauthorizedCreator = {
                ...mockCreator,
                testCenterOwner: new ObjectId() // Different owner
            };

            subscriptionService.validateAction.mockResolvedValue({ allowed: true });
            User.findById.mockResolvedValue(unauthorizedCreator);

            // Act & Assert
            await expect(testService.createTest(testData, mockOwner._id, mockCreator._id))
                .rejects.toThrow('User does not have permission to create tests for this test center');
        });

        it('should throw error when subject not found', async () => {
            // Arrange
            const testData = {
                title: 'Test',
                subject: new ObjectId()
            };

            subscriptionService.validateAction.mockResolvedValue({ allowed: true });
            User.findById.mockResolvedValue(mockOwner);
            Subject.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(testService.createTest(testData, mockOwner._id, mockOwner._id))
                .rejects.toThrow('Subject is invalid or does not belong to this test center');
        });

        it('should handle database errors during creation', async () => {
            // Arrange
            const testData = { title: 'Test' };
            subscriptionService.validateAction.mockResolvedValue({ allowed: true });
            User.findById.mockResolvedValue(mockOwner);
            Test.mockImplementation(() => {
                throw new Error('Database connection failed');
            });

            // Act & Assert
            await expect(testService.createTest(testData, mockOwner._id, mockOwner._id))
                .rejects.toThrow('Database connection failed');
        });
    });

    describe('getTestsByOwner - Test Listing', () => {
        it('should get tests with default pagination', async () => {
            // Arrange
            const mockTests = [mockTest];
            const mockTotal = 1;

            Test.findByOwner.mockResolvedValue(mockTests);
            Test.countDocuments.mockResolvedValue(mockTotal);

            // Act
            const result = await testService.getTestsByOwner(mockOwner._id);

            // Assert
            expect(Test.findByOwner).toHaveBeenCalledWith(mockOwner._id, {
                status: undefined,
                search: undefined,
                subject: undefined,
                sort: { createdAt: -1 },
                limit: 20,
                skip: 0
            });
            expect(Test.countDocuments).toHaveBeenCalledWith({
                testCenterOwner: mockOwner._id
            });
            expect(result).toEqual({
                tests: mockTests,
                pagination: {
                    page: 1,
                    limit: 20,
                    total: mockTotal,
                    pages: 1
                }
            });
        });

        it('should get tests with advanced filters and pagination', async () => {
            // Arrange
            const options = {
                page: 2,
                limit: 10,
                status: 'active',
                search: 'math',
                subject: mockSubject._id,
                sort: 'title'
            };
            const mockTests = [mockTest];
            const mockTotal = 15;

            Test.findByOwner.mockResolvedValue(mockTests);
            Test.countDocuments.mockResolvedValue(mockTotal);

            // Act
            const result = await testService.getTestsByOwner(mockOwner._id, options);

            // Assert
            expect(Test.findByOwner).toHaveBeenCalledWith(mockOwner._id, {
                status: 'active',
                search: 'math',
                subject: mockSubject._id,
                sort: { title: -1 },
                limit: 10,
                skip: 10
            });
            expect(Test.countDocuments).toHaveBeenCalledWith({
                testCenterOwner: mockOwner._id,
                status: 'active',
                subject: mockSubject._id
            });
            expect(result.pagination).toEqual({
                page: 2,
                limit: 10,
                total: 15,
                pages: 2
            });
        });

        it('should handle empty results', async () => {
            // Arrange
            Test.findByOwner.mockResolvedValue([]);
            Test.countDocuments.mockResolvedValue(0);

            // Act
            const result = await testService.getTestsByOwner(mockOwner._id);

            // Assert
            expect(result.tests).toEqual([]);
            expect(result.pagination.total).toBe(0);
            expect(result.pagination.pages).toBe(0);
        });

        it('should handle database errors during listing', async () => {
            // Arrange
            Test.findByOwner.mockRejectedValue(new Error('Database query failed'));

            // Act & Assert
            await expect(testService.getTestsByOwner(mockOwner._id))
                .rejects.toThrow('Database query failed');
        });
    });

    describe('getTestById - Single Test Retrieval', () => {
        it('should get test successfully', async () => {
            // Arrange
            const mockPopulatedTest = { ...mockTest };
            Test.findOne.mockReturnValue({
                populate: vi.fn().mockResolvedValue(mockPopulatedTest)
            });

            // Act
            const result = await testService.getTestById(mockTest._id, mockOwner._id);

            // Assert
            expect(Test.findOne).toHaveBeenCalledWith({
                _id: mockTest._id,
                testCenterOwner: mockOwner._id
            });
            expect(result).toBe(mockPopulatedTest);
        });

        it('should throw error when test not found', async () => {
            // Arrange
            Test.findOne.mockReturnValue({
                populate: vi.fn().mockResolvedValue(null)
            });

            // Act & Assert
            await expect(testService.getTestById(mockTest._id, mockOwner._id))
                .rejects.toThrow('Test not found or access denied');
        });

        it('should handle database errors during retrieval', async () => {
            // Arrange
            Test.findOne.mockReturnValue({
                populate: vi.fn().mockRejectedValue(new Error('Database error'))
            });

            // Act & Assert
            await expect(testService.getTestById(mockTest._id, mockOwner._id))
                .rejects.toThrow('Database error');
        });
    });

    describe('updateTest - Test Updates', () => {
        it('should update test successfully in draft status', async () => {
            // Arrange
            const updateData = {
                title: 'Updated Test',
                description: 'Updated description'
            };

            Test.findOne.mockResolvedValue(mockTest);

            // Act
            const result = await testService.updateTest(mockTest._id, updateData, mockOwner._id, mockCreator._id);

            // Assert
            expect(Test.findOne).toHaveBeenCalledWith({
                _id: mockTest._id,
                testCenterOwner: mockOwner._id
            });
            expect(mockTest.title).toBe(updateData.title);
            expect(mockTest.description).toBe(updateData.description);
            expect(mockTest.save).toHaveBeenCalled();
            expect(result).toBe(mockTest);
        });

        it('should update test with subject change', async () => {
            // Arrange
            const newSubject = { ...mockSubject, _id: new ObjectId() };
            const updateData = { subject: newSubject._id };

            Test.findOne.mockResolvedValue(mockTest);
            Subject.findOne.mockResolvedValue(newSubject);

            // Act
            const result = await testService.updateTest(mockTest._id, updateData, mockOwner._id, mockCreator._id);

            // Assert
            expect(Subject.findOne).toHaveBeenCalledWith({
                _id: newSubject._id,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(result).toBe(mockTest);
        });

        it('should throw error when test not found for update', async () => {
            // Arrange
            const updateData = { title: 'New Title' };
            Test.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(testService.updateTest(mockTest._id, updateData, mockOwner._id, mockCreator._id))
                .rejects.toThrow('Test not found or access denied');
        });

        it('should throw error when updating restricted fields in active test', async () => {
            // Arrange
            const activeTest = { ...mockTest, status: 'active' };
            const updateData = { totalQuestions: 20 };

            Test.findOne.mockResolvedValue(activeTest);

            // Act & Assert
            await expect(testService.updateTest(mockTest._id, updateData, mockOwner._id, mockCreator._id))
                .rejects.toThrow('Cannot modify core test settings for active or completed tests');
        });

        it('should throw error when updating restricted fields in completed test', async () => {
            // Arrange
            const completedTest = { ...mockTest, status: 'completed' };
            const updateData = { questions: [new ObjectId()] };

            Test.findOne.mockResolvedValue(completedTest);

            // Act & Assert
            await expect(testService.updateTest(mockTest._id, updateData, mockOwner._id, mockCreator._id))
                .rejects.toThrow('Cannot modify core test settings for active or completed tests');
        });

        it('should throw error when new subject not found', async () => {
            // Arrange
            const updateData = { subject: new ObjectId() };
            Test.findOne.mockResolvedValue(mockTest);
            Subject.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(testService.updateTest(mockTest._id, updateData, mockOwner._id, mockCreator._id))
                .rejects.toThrow('Subject is invalid or does not belong to this test center');
        });

        it('should handle database errors during update', async () => {
            // Arrange
            const updateData = { title: 'New Title' };
            Test.findOne.mockRejectedValue(new Error('Database connection lost'));

            // Act & Assert
            await expect(testService.updateTest(mockTest._id, updateData, mockOwner._id, mockCreator._id))
                .rejects.toThrow('Database connection lost');
        });
    });

    describe('deleteTest - Test Deletion', () => {
        it('should delete test successfully', async () => {
            // Arrange
            Test.findOne.mockResolvedValue(mockTest);
            Test.findByIdAndDelete.mockResolvedValue(mockTest);

            // Act
            const result = await testService.deleteTest(mockTest._id, mockOwner._id);

            // Assert
            expect(Test.findOne).toHaveBeenCalledWith({
                _id: mockTest._id,
                testCenterOwner: mockOwner._id
            });
            expect(Test.findByIdAndDelete).toHaveBeenCalledWith(mockTest._id);
            expect(result).toEqual({
                success: true,
                message: 'Test deleted successfully'
            });
        });

        it('should throw error when test not found for deletion', async () => {
            // Arrange
            Test.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(testService.deleteTest(mockTest._id, mockOwner._id))
                .rejects.toThrow('Test not found or access denied');
        });

        it('should throw error when deleting active test', async () => {
            // Arrange
            const activeTest = { ...mockTest, status: 'active' };
            Test.findOne.mockResolvedValue(activeTest);

            // Act & Assert
            await expect(testService.deleteTest(mockTest._id, mockOwner._id))
                .rejects.toThrow('Cannot delete active test');
        });

        it('should throw error when deleting completed test with attempts', async () => {
            // Arrange
            const completedTest = {
                ...mockTest,
                status: 'completed',
                stats: { totalAttempts: 5 }
            };
            Test.findOne.mockResolvedValue(completedTest);

            // Act & Assert
            await expect(testService.deleteTest(mockTest._id, mockOwner._id))
                .rejects.toThrow('Cannot delete completed test with student attempts');
        });

        it('should delete completed test without attempts', async () => {
            // Arrange
            const completedTest = {
                ...mockTest,
                status: 'completed',
                stats: { totalAttempts: 0 }
            };
            Test.findOne.mockResolvedValue(completedTest);
            Test.findByIdAndDelete.mockResolvedValue(completedTest);

            // Act
            const result = await testService.deleteTest(mockTest._id, mockOwner._id);

            // Assert
            expect(result.success).toBe(true);
        });

        it('should handle database errors during deletion', async () => {
            // Arrange
            Test.findOne.mockRejectedValue(new Error('Database timeout'));

            // Act & Assert
            await expect(testService.deleteTest(mockTest._id, mockOwner._id))
                .rejects.toThrow('Database timeout');
        });
    });

    describe('addQuestionToTest - Question Addition', () => {
        it('should add question to test successfully', async () => {
            // Arrange
            const questionData = {
                questionText: 'New question?',
                type: 'multiple_choice',
                options: ['A', 'B', 'C', 'D'],
                correctAnswer: 'A'
            };

            Test.findOne.mockResolvedValue(mockTest);
            subscriptionService.validateAction.mockResolvedValue({ allowed: true });
            Question.mockImplementation(() => mockQuestion);

            // Act
            const result = await testService.addQuestionToTest(
                mockTest._id,
                questionData,
                mockOwner._id,
                mockCreator._id
            );

            // Assert
            expect(Test.findOne).toHaveBeenCalledWith({
                _id: mockTest._id,
                testCenterOwner: mockOwner._id
            });
            expect(subscriptionService.validateAction).toHaveBeenCalledWith(
                mockCreator._id,
                'addQuestionToTest',
                { currentQuestionsInTest: 0 }
            );
            expect(Question).toHaveBeenCalledWith({
                ...questionData,
                testCenterOwner: mockOwner._id,
                createdBy: mockCreator._id
            });
            expect(mockQuestion.save).toHaveBeenCalled();
            expect(mockTest.questions).toContain(mockQuestion._id);
            expect(mockTest.save).toHaveBeenCalled();
            expect(result).toBe(mockQuestion);
        });

        it('should throw error when test not found for question addition', async () => {
            // Arrange
            const questionData = { questionText: 'Question?' };
            Test.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(testService.addQuestionToTest(
                mockTest._id,
                questionData,
                mockOwner._id,
                mockCreator._id
            )).rejects.toThrow('Test not found or access denied');
        });

        it('should throw error when adding question to active test', async () => {
            // Arrange
            const activeTest = { ...mockTest, status: 'active' };
            const questionData = { questionText: 'Question?' };
            Test.findOne.mockResolvedValue(activeTest);

            // Act & Assert
            await expect(testService.addQuestionToTest(
                mockTest._id,
                questionData,
                mockOwner._id,
                mockCreator._id
            )).rejects.toThrow('Cannot modify questions in active or completed tests');
        });

        it('should throw error when adding question to completed test', async () => {
            // Arrange
            const completedTest = { ...mockTest, status: 'completed' };
            const questionData = { questionText: 'Question?' };
            Test.findOne.mockResolvedValue(completedTest);

            // Act & Assert
            await expect(testService.addQuestionToTest(
                mockTest._id,
                questionData,
                mockOwner._id,
                mockCreator._id
            )).rejects.toThrow('Cannot modify questions in active or completed tests');
        });

        it('should throw error when subscription validation fails for question addition', async () => {
            // Arrange
            const questionData = { questionText: 'Question?' };
            Test.findOne.mockResolvedValue(mockTest);
            subscriptionService.validateAction.mockResolvedValue({
                allowed: false,
                message: 'Question limit exceeded'
            });

            // Act & Assert
            await expect(testService.addQuestionToTest(
                mockTest._id,
                questionData,
                mockOwner._id,
                mockCreator._id
            )).rejects.toThrow('Question limit exceeded');
        });

        it('should handle database errors during question addition', async () => {
            // Arrange
            const questionData = { questionText: 'Question?' };
            Test.findOne.mockResolvedValue(mockTest);
            subscriptionService.validateAction.mockResolvedValue({ allowed: true });
            Question.mockImplementation(() => {
                throw new Error('Question creation failed');
            });

            // Act & Assert
            await expect(testService.addQuestionToTest(
                mockTest._id,
                questionData,
                mockOwner._id,
                mockCreator._id
            )).rejects.toThrow('Question creation failed');
        });
    });

    describe('getTestQuestions - Test Question Retrieval', () => {
        it('should get test questions successfully', async () => {
            // Arrange
            const populatedTest = {
                ...mockTest,
                questions: [mockQuestion]
            };

            Test.findOne.mockReturnValue({
                populate: vi.fn().mockResolvedValue(populatedTest)
            });

            // Act
            const result = await testService.getTestQuestions(mockTest._id, mockOwner._id);

            // Assert
            expect(Test.findOne).toHaveBeenCalledWith({
                _id: mockTest._id,
                testCenterOwner: mockOwner._id
            });
            expect(result).toEqual([mockQuestion]);
        });

        it('should throw error when test not found for question retrieval', async () => {
            // Arrange
            Test.findOne.mockReturnValue({
                populate: vi.fn().mockResolvedValue(null)
            });

            // Act & Assert
            await expect(testService.getTestQuestions(mockTest._id, mockOwner._id))
                .rejects.toThrow('Test not found or access denied');
        });

        it('should handle database errors during question retrieval', async () => {
            // Arrange
            Test.findOne.mockReturnValue({
                populate: vi.fn().mockRejectedValue(new Error('Population failed'))
            });

            // Act & Assert
            await expect(testService.getTestQuestions(mockTest._id, mockOwner._id))
                .rejects.toThrow('Population failed');
        });
    });

    describe('countUserTests - Helper Method', () => {
        it('should count user tests successfully', async () => {
            // Arrange
            Test.countDocuments.mockResolvedValue(5);

            // Act
            const result = await testService.countUserTests(mockOwner._id);

            // Assert
            expect(Test.countDocuments).toHaveBeenCalledWith({
                testCenterOwner: mockOwner._id,
                status: { $ne: 'archived' }
            });
            expect(result).toBe(5);
        });

        it('should return 0 when count fails', async () => {
            // Arrange
            Test.countDocuments.mockRejectedValue(new Error('Count failed'));

            // Act
            const result = await testService.countUserTests(mockOwner._id);

            // Assert
            expect(result).toBe(0);
            expect(logger.error).toHaveBeenCalledWith('Failed to count tests:', expect.any(Error));
        });
    });

    describe('countQuestions - Helper Method', () => {
        it('should count questions successfully', async () => {
            // Arrange
            Question.countDocuments.mockResolvedValue(25);

            // Act
            const result = await testService.countQuestions(mockOwner._id);

            // Assert
            expect(Question.countDocuments).toHaveBeenCalledWith({
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(result).toBe(25);
        });

        it('should return 0 when count fails', async () => {
            // Arrange
            Question.countDocuments.mockRejectedValue(new Error('Count failed'));

            // Act
            const result = await testService.countQuestions(mockOwner._id);

            // Assert
            expect(result).toBe(0);
            expect(logger.error).toHaveBeenCalledWith('Failed to count questions:', expect.any(Error));
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle concurrent operations gracefully', async () => {
            // Arrange
            Test.countDocuments.mockResolvedValue(3);
            Question.countDocuments.mockResolvedValue(15);

            // Act
            const [testCount, questionCount] = await Promise.all([
                testService.countUserTests(mockOwner._id),
                testService.countQuestions(mockOwner._id)
            ]);

            // Assert
            expect(testCount).toBe(3);
            expect(questionCount).toBe(15);
        });

        it('should handle invalid ObjectId gracefully', async () => {
            // Arrange
            const invalidId = 'invalid-object-id';
            Test.findOne.mockReturnValue({
                populate: vi.fn().mockRejectedValue(new Error('Cast to ObjectId failed'))
            });

            // Act & Assert
            await expect(testService.getTestById(invalidId, mockOwner._id))
                .rejects.toThrow('Cast to ObjectId failed');
        });

        it('should handle network timeout errors', async () => {
            // Arrange
            Test.findByOwner.mockRejectedValue(new Error('Network timeout'));

            // Act & Assert
            await expect(testService.getTestsByOwner(mockOwner._id))
                .rejects.toThrow('Network timeout');
        });

        it('should handle memory constraint errors during test creation', async () => {
            // Arrange
            const testData = { title: 'Large Test' };
            subscriptionService.validateAction.mockResolvedValue({ allowed: true });
            User.findById.mockResolvedValue(mockOwner);
            Test.mockImplementation(() => {
                throw new Error('Out of memory');
            });

            // Act & Assert
            await expect(testService.createTest(testData, mockOwner._id, mockOwner._id))
                .rejects.toThrow('Out of memory');
        });
    });

    describe('getTestWithEnrollmentInfo - Enhanced Test Retrieval', () => {
        it('should get test with enrollment information successfully', async () => {
            // Arrange
            const testWithEnrollment = {
                ...mockTest,
                enrollmentConfig: {
                    isEnrollmentRequired: true,
                    enrollmentFee: 100,
                    maxEnrollments: 50
                },
                enrollmentStats: {
                    totalEnrollments: 25,
                    activeEnrollments: 20,
                    pendingPayments: 5,
                    totalRevenue: 2000
                }
            };

            Test.findOne.mockReturnValue({
                populate: vi.fn().mockResolvedValue(testWithEnrollment)
            });

            // Act
            const result = await testService.getTestWithEnrollmentInfo(mockTest._id, mockOwner._id);

            // Assert
            expect(Test.findOne).toHaveBeenCalledWith({
                _id: mockTest._id,
                testCenterOwner: mockOwner._id
            });
            expect(result).toEqual(testWithEnrollment);
            expect(result.enrollmentConfig).toBeDefined();
            expect(result.enrollmentStats).toBeDefined();
        });

        it('should throw error when test not found for enrollment info', async () => {
            // Arrange
            Test.findOne.mockReturnValue({
                populate: vi.fn().mockResolvedValue(null)
            });

            // Act & Assert
            await expect(testService.getTestWithEnrollmentInfo(mockTest._id, mockOwner._id))
                .rejects.toThrow('Test not found or access denied');
        });

        it('should handle database errors during enrollment info retrieval', async () => {
            // Arrange
            Test.findOne.mockReturnValue({
                populate: vi.fn().mockRejectedValue(new Error('Database connection failed'))
            });

            // Act & Assert
            await expect(testService.getTestWithEnrollmentInfo(mockTest._id, mockOwner._id))
                .rejects.toThrow('Database connection failed');
        });
    });

    describe('updateEnrollmentConfig - Enrollment Configuration', () => {
        it('should update enrollment configuration successfully', async () => {
            // Arrange
            const enrollmentConfig = {
                isEnrollmentRequired: true,
                enrollmentFee: 150,
                maxEnrollments: 100,
                requirePayment: true,
                allowLateEnrollment: false,
                autoApprove: true,
                enrollmentDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            };

            const updatedTest = {
                ...mockTest,
                enrollmentConfig
            };

            Test.findOne.mockResolvedValue(mockTest);
            mockTest.save.mockResolvedValue(updatedTest);

            // Act
            const result = await testService.updateEnrollmentConfig(
                mockTest._id,
                mockOwner._id,
                enrollmentConfig
            );

            // Assert
            expect(Test.findOne).toHaveBeenCalledWith({
                _id: mockTest._id,
                testCenterOwner: mockOwner._id
            });
            expect(mockTest.enrollmentConfig).toEqual(enrollmentConfig);
            expect(mockTest.save).toHaveBeenCalled();
            expect(result).toEqual(updatedTest);
        });

        it('should validate enrollment fee is non-negative', async () => {
            // Arrange
            const invalidConfig = {
                enrollmentFee: -50
            };

            Test.findOne.mockResolvedValue(mockTest);

            // Act & Assert
            await expect(testService.updateEnrollmentConfig(
                mockTest._id,
                mockOwner._id,
                invalidConfig
            )).rejects.toThrow('Enrollment fee must be non-negative');
        });

        it('should validate max enrollments is positive', async () => {
            // Arrange
            const invalidConfig = {
                maxEnrollments: 0
            };

            Test.findOne.mockResolvedValue(mockTest);

            // Act & Assert
            await expect(testService.updateEnrollmentConfig(
                mockTest._id,
                mockOwner._id,
                invalidConfig
            )).rejects.toThrow('Maximum enrollments must be positive');
        });

        it('should validate enrollment deadline is in future', async () => {
            // Arrange
            const invalidConfig = {
                enrollmentDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000)
            };

            Test.findOne.mockResolvedValue(mockTest);

            // Act & Assert
            await expect(testService.updateEnrollmentConfig(
                mockTest._id,
                mockOwner._id,
                invalidConfig
            )).rejects.toThrow('Enrollment deadline must be in the future');
        });

        it('should handle partial enrollment config updates', async () => {
            // Arrange
            const partialConfig = {
                enrollmentFee: 200
            };

            const existingConfig = {
                isEnrollmentRequired: true,
                enrollmentFee: 100,
                maxEnrollments: 50
            };

            const testWithConfig = {
                ...mockTest,
                enrollmentConfig: existingConfig
            };

            Test.findOne.mockResolvedValue(testWithConfig);
            testWithConfig.save = vi.fn().mockResolvedValue(testWithConfig);

            // Act
            const result = await testService.updateEnrollmentConfig(
                mockTest._id,
                mockOwner._id,
                partialConfig
            );

            // Assert
            expect(testWithConfig.enrollmentConfig.enrollmentFee).toBe(200);
            expect(testWithConfig.enrollmentConfig.isEnrollmentRequired).toBe(true);
            expect(testWithConfig.enrollmentConfig.maxEnrollments).toBe(50);
        });

        it('should throw error when test not found for config update', async () => {
            // Arrange
            Test.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(testService.updateEnrollmentConfig(
                mockTest._id,
                mockOwner._id,
                {}
            )).rejects.toThrow('Test not found or access denied');
        });

        it('should handle database errors during config update', async () => {
            // Arrange
            Test.findOne.mockResolvedValue(mockTest);
            mockTest.save.mockRejectedValue(new Error('Save operation failed'));

            // Act & Assert
            await expect(testService.updateEnrollmentConfig(
                mockTest._id,
                mockOwner._id,
                { enrollmentFee: 100 }
            )).rejects.toThrow('Save operation failed');
        });
    });

    describe('Enrollment Integration Tests', () => {
        it('should handle tests with enrollment requirements during creation', async () => {
            // Arrange
            const testData = {
                title: 'Enrollment Test',
                description: 'Test with enrollment',
                subject: mockSubject._id,
                enrollmentConfig: {
                    isEnrollmentRequired: true,
                    enrollmentFee: 50,
                    maxEnrollments: 30
                }
            };

            Subject.findOne.mockResolvedValue(mockSubject);
            User.findById.mockResolvedValue(mockOwner);
            Question.countDocuments.mockResolvedValue(5);
            Test.mockImplementation(() => ({
                ...mockTest,
                ...testData,
                save: vi.fn().mockResolvedValue({
                    ...mockTest,
                    ...testData
                })
            }));

            subscriptionService.validateAction.mockResolvedValue(true);

            // Act
            const result = await testService.createTest(testData, mockOwner._id);

            // Assert
            expect(result.enrollmentConfig.isEnrollmentRequired).toBe(true);
            expect(result.enrollmentConfig.enrollmentFee).toBe(50);
            expect(result.enrollmentConfig.maxEnrollments).toBe(30);
        });

        it('should update enrollment statistics correctly', async () => {
            // Arrange
            const statsUpdate = {
                totalEnrollments: 25,
                activeEnrollments: 20,
                pendingPayments: 5,
                totalRevenue: 1000
            };

            Test.findOne.mockResolvedValue({
                ...mockTest,
                enrollmentStats: {}
            });

            // Mock the save method to update stats
            const testWithStats = {
                ...mockTest,
                enrollmentStats: statsUpdate,
                save: vi.fn().mockResolvedValue(true)
            };

            Test.findOne.mockResolvedValue(testWithStats);

            // Act
            const result = await testService.updateEnrollmentConfig(
                mockTest._id,
                mockOwner._id,
                { enrollmentFee: 100 }
            );

            // Assert - Should preserve existing stats during config update
            expect(testWithStats.save).toHaveBeenCalled();
        });
    });
});
