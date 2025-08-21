import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { questionBankService } from '../../modules/questions/service.js';

const { ObjectId } = mongoose.Types;

// Mock the models
vi.mock('../../models/index.js', () => ({
    Question: vi.fn(),
    Subject: vi.fn(),
    User: vi.fn(),
    Test: vi.fn()
}));

// Mock logger
vi.mock('../../config/logger.js');

import { Question, Subject, User, Test } from '../../models/index.js';
import { logger } from '../../config/logger.js';

describe('QuestionBankService - Complete Coverage', () => {
    let mockOwner, mockCreator, mockSubject, mockQuestion, mockQuestions;

    beforeEach(() => {
        vi.clearAllMocks();

        // Set up model static methods
        Question.findOne = vi.fn();
        Question.findByOwner = vi.fn();
        Question.countDocuments = vi.fn();
        Question.findBySubject = vi.fn();
        Question.getRandomQuestions = vi.fn();
        Question.populate = vi.fn();
        Question.find = vi.fn();
        Question.getQuestionStats = vi.fn();

        Subject.findOne = vi.fn();
        Subject.findById = vi.fn();
        User.findById = vi.fn();
        Test.countDocuments = vi.fn();

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
            email: 'creator@test.com'
        };

        mockSubject = {
            _id: new ObjectId(),
            name: 'Mathematics',
            code: 'MATH',
            color: '#FF5722',
            testCenterOwner: mockOwner._id,
            isActive: true,
            updateStats: vi.fn().mockResolvedValue()
        };

        mockQuestion = {
            _id: new ObjectId(),
            questionText: 'What is 2 + 2?',
            type: 'multiple_choice',
            difficulty: 'easy',
            subject: mockSubject._id,
            testCenterOwner: mockOwner._id,
            createdBy: mockCreator._id,
            isActive: true,
            keywords: ['math', 'addition'],
            options: [
                { text: '3', isCorrect: false },
                { text: '4', isCorrect: true },
                { text: '5', isCorrect: false }
            ],
            save: vi.fn(),
            populate: vi.fn(),
            duplicate: vi.fn(),
            media: {}
        };

        mockQuestions = [
            { ...mockQuestion, questionText: 'Question 1' },
            { ...mockQuestion, _id: new ObjectId(), questionText: 'Question 2' },
            { ...mockQuestion, _id: new ObjectId(), questionText: 'Question 3' }
        ];
    });

    describe('createQuestion - Question Creation', () => {
        it('should create question successfully as test center owner', async () => {
            // Arrange
            const questionData = {
                questionText: 'What is 3 + 3?',
                type: 'multiple_choice',
                difficulty: 'easy',
                subject: mockSubject._id,
                options: [
                    { text: '5', isCorrect: false },
                    { text: '6', isCorrect: true },
                    { text: '7', isCorrect: false }
                ]
            };

            User.findById.mockResolvedValue(mockOwner);
            Subject.findOne.mockResolvedValue(mockSubject);

            const mockNewQuestion = {
                ...mockQuestion,
                save: vi.fn().mockResolvedValue(mockQuestion),
                populate: vi.fn().mockResolvedValue(mockQuestion)
            };
            Question.mockImplementation(() => mockNewQuestion);

            // Act
            const result = await questionBankService.createQuestion(questionData, mockOwner._id, mockOwner._id);

            // Assert
            expect(User.findById).toHaveBeenCalledWith(mockOwner._id);
            expect(Subject.findOne).toHaveBeenCalledWith({
                _id: questionData.subject,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(Question).toHaveBeenCalledWith({
                ...questionData,
                testCenterOwner: mockOwner._id,
                createdBy: mockOwner._id
            });
            expect(mockNewQuestion.save).toHaveBeenCalled();
            expect(mockSubject.updateStats).toHaveBeenCalled();
            expect(mockNewQuestion.populate).toHaveBeenCalledWith([
                { path: 'subject', select: 'name code color' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ]);
        });

        it('should create question successfully as test creator', async () => {
            // Arrange
            const questionData = {
                questionText: 'Test question',
                type: 'true_false',
                difficulty: 'medium',
                subject: mockSubject._id
            };

            User.findById.mockResolvedValue(mockCreator);
            Subject.findOne.mockResolvedValue(mockSubject);

            const mockNewQuestion = {
                save: vi.fn().mockResolvedValue(mockQuestion),
                populate: vi.fn().mockResolvedValue(mockQuestion)
            };
            Question.mockImplementation(() => mockNewQuestion);

            // Act
            const result = await questionBankService.createQuestion(questionData, mockOwner._id, mockCreator._id);

            // Assert
            expect(User.findById).toHaveBeenCalledWith(mockCreator._id);
            expect(mockNewQuestion.save).toHaveBeenCalled();
        });

        it('should throw error when creator not found', async () => {
            // Arrange
            User.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(
                questionBankService.createQuestion({ questionText: 'Test' }, mockOwner._id, new ObjectId())
            ).rejects.toThrow('Creator not found');
        });

        it('should throw error when creator has no permission', async () => {
            // Arrange
            const unauthorizedCreator = {
                ...mockCreator,
                testCenterOwner: new ObjectId()
            };
            User.findById.mockResolvedValue(unauthorizedCreator);

            // Act & Assert
            await expect(
                questionBankService.createQuestion({ questionText: 'Test' }, mockOwner._id, unauthorizedCreator._id)
            ).rejects.toThrow('User does not have permission to create questions for this test center');
        });

        it('should throw error when subject not found', async () => {
            // Arrange
            User.findById.mockResolvedValue(mockOwner);
            Subject.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                questionBankService.createQuestion({ subject: new ObjectId() }, mockOwner._id, mockOwner._id)
            ).rejects.toThrow('Subject not found or does not belong to this test center');
        });

        it('should handle database errors during creation', async () => {
            // Arrange
            User.findById.mockResolvedValue(mockOwner);
            Subject.findOne.mockResolvedValue(mockSubject);

            const mockNewQuestion = {
                save: vi.fn().mockRejectedValue(new Error('Save failed'))
            };
            Question.mockImplementation(() => mockNewQuestion);

            // Act & Assert
            await expect(
                questionBankService.createQuestion({ subject: mockSubject._id }, mockOwner._id, mockOwner._id)
            ).rejects.toThrow('Save failed');
        });
    });

    describe('getQuestions - Question Listing', () => {
        it('should get questions with default pagination', async () => {
            // Arrange
            Question.findByOwner.mockResolvedValue(mockQuestions);
            Question.countDocuments.mockResolvedValue(15);

            // Act
            const result = await questionBankService.getQuestions(mockOwner._id);

            // Assert
            expect(Question.findByOwner).toHaveBeenCalledWith(mockOwner._id, {
                subject: undefined,
                type: undefined,
                difficulty: undefined,
                search: undefined,
                keywords: undefined,
                sort: { createdAt: -1 },
                limit: 20,
                skip: 0
            });
            expect(Question.countDocuments).toHaveBeenCalledWith({
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(result).toEqual({
                questions: mockQuestions,
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 15,
                    pages: 1
                }
            });
        });

        it('should get questions with advanced filters', async () => {
            // Arrange
            const options = {
                page: 2,
                limit: 10,
                subject: mockSubject._id,
                type: 'multiple_choice',
                difficulty: 'hard',
                search: 'math',
                keywords: 'algebra,geometry',
                createdBy: mockCreator._id,
                sort: 'difficulty'
            };

            Question.findByOwner.mockResolvedValue(mockQuestions.slice(0, 2));
            Question.countDocuments.mockResolvedValue(25);

            // Act
            const result = await questionBankService.getQuestions(mockOwner._id, options);

            // Assert
            expect(Question.findByOwner).toHaveBeenCalledWith(mockOwner._id, {
                subject: mockSubject._id,
                type: 'multiple_choice',
                difficulty: 'hard',
                search: 'math',
                keywords: ['algebra', 'geometry'],
                sort: { difficulty: -1 },
                limit: 10,
                skip: 10
            });
            expect(Question.countDocuments).toHaveBeenCalledWith({
                testCenterOwner: mockOwner._id,
                isActive: true,
                subject: mockSubject._id,
                type: 'multiple_choice',
                difficulty: 'hard',
                createdBy: mockCreator._id,
                $text: { $search: 'math' },
                keywords: { $in: ['algebra', 'geometry'] }
            });
            expect(result.pagination.pages).toBe(3);
        });

        it('should handle empty results', async () => {
            // Arrange
            Question.findByOwner.mockResolvedValue([]);
            Question.countDocuments.mockResolvedValue(0);

            // Act
            const result = await questionBankService.getQuestions(mockOwner._id);

            // Assert
            expect(result.questions).toEqual([]);
            expect(result.pagination.total).toBe(0);
        });

        it('should handle database errors during listing', async () => {
            // Arrange
            Question.findByOwner.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(
                questionBankService.getQuestions(mockOwner._id)
            ).rejects.toThrow('Database error');
        });
    });

    describe('getQuestionById - Single Question Retrieval', () => {
        it('should get question successfully', async () => {
            // Arrange
            const mockQuery = {
                populate: vi.fn().mockResolvedValue(mockQuestion)
            };
            Question.findOne.mockReturnValue(mockQuery);

            // Act
            const result = await questionBankService.getQuestionById(mockQuestion._id, mockOwner._id);

            // Assert
            expect(Question.findOne).toHaveBeenCalledWith({
                _id: mockQuestion._id,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(mockQuery.populate).toHaveBeenCalledWith([
                { path: 'subject', select: 'name code color' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ]);
            expect(result).toEqual(mockQuestion);
        });

        it('should throw error when question not found', async () => {
            // Arrange
            const mockQuery = {
                populate: vi.fn().mockResolvedValue(null)
            };
            Question.findOne.mockReturnValue(mockQuery);

            // Act & Assert
            await expect(
                questionBankService.getQuestionById(new ObjectId(), mockOwner._id)
            ).rejects.toThrow('Question not found');
        });

        it('should handle database errors during retrieval', async () => {
            // Arrange
            const mockQuery = {
                populate: vi.fn().mockRejectedValue(new Error('Database error'))
            };
            Question.findOne.mockReturnValue(mockQuery);

            // Act & Assert
            await expect(
                questionBankService.getQuestionById(mockQuestion._id, mockOwner._id)
            ).rejects.toThrow('Database error');
        });
    });

    describe('updateQuestion - Question Updates', () => {
        it('should update question successfully without subject change', async () => {
            // Arrange
            const updateData = {
                questionText: 'Updated question text',
                difficulty: 'hard'
            };

            Question.findOne.mockResolvedValue(mockQuestion);
            Subject.findById.mockResolvedValue(mockSubject);
            mockQuestion.save.mockResolvedValue(mockQuestion);
            mockQuestion.populate.mockResolvedValue(mockQuestion);

            // Act
            const result = await questionBankService.updateQuestion(mockQuestion._id, updateData, mockOwner._id);

            // Assert
            expect(Question.findOne).toHaveBeenCalledWith({
                _id: mockQuestion._id,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(mockQuestion.save).toHaveBeenCalled();
            expect(mockSubject.updateStats).toHaveBeenCalled();
            expect(mockQuestion.populate).toHaveBeenCalledWith([
                { path: 'subject', select: 'name code color' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ]);
        });

        it('should update question with subject change', async () => {
            // Arrange
            const newSubject = { ...mockSubject, _id: new ObjectId() };
            const updateData = {
                questionText: 'Updated text',
                subject: newSubject._id
            };

            Question.findOne.mockResolvedValue(mockQuestion);
            Subject.findOne.mockResolvedValue(newSubject);
            Subject.findById.mockResolvedValue(mockSubject);
            mockQuestion.save.mockResolvedValue(mockQuestion);
            mockQuestion.populate.mockResolvedValue(mockQuestion);

            // Act
            const result = await questionBankService.updateQuestion(mockQuestion._id, updateData, mockOwner._id);

            // Assert
            expect(Subject.findOne).toHaveBeenCalledWith({
                _id: newSubject._id,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(mockQuestion.save).toHaveBeenCalled();
        });

        it('should throw error when question not found for update', async () => {
            // Arrange
            Question.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                questionBankService.updateQuestion(new ObjectId(), { questionText: 'Test' }, mockOwner._id)
            ).rejects.toThrow('Question not found');
        });

        it('should throw error when new subject not found', async () => {
            // Arrange
            Question.findOne.mockResolvedValue(mockQuestion);
            Subject.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                questionBankService.updateQuestion(mockQuestion._id, { subject: new ObjectId() }, mockOwner._id)
            ).rejects.toThrow('Subject not found or does not belong to this test center');
        });

        it('should handle database errors during update', async () => {
            // Arrange
            Question.findOne.mockResolvedValue(mockQuestion);
            mockQuestion.save.mockRejectedValue(new Error('Update failed'));

            // Act & Assert
            await expect(
                questionBankService.updateQuestion(mockQuestion._id, { questionText: 'Test' }, mockOwner._id)
            ).rejects.toThrow('Update failed');
        });
    });

    describe('deleteQuestion - Question Deletion', () => {
        it('should delete question successfully', async () => {
            // Arrange
            Question.findOne.mockResolvedValue(mockQuestion);
            Test.countDocuments.mockResolvedValue(0); // No active tests using question
            Subject.findById.mockResolvedValue(mockSubject);
            mockQuestion.save.mockResolvedValue(mockQuestion);

            // Act
            const result = await questionBankService.deleteQuestion(mockQuestion._id, mockOwner._id);

            // Assert
            expect(Question.findOne).toHaveBeenCalledWith({
                _id: mockQuestion._id,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(Test.countDocuments).toHaveBeenCalledWith({
                questions: mockQuestion._id,
                status: { $in: ['published', 'active'] }
            });
            expect(mockQuestion.save).toHaveBeenCalled();
            expect(mockSubject.updateStats).toHaveBeenCalled();
            expect(result).toEqual({
                success: true,
                message: 'Question deleted successfully'
            });
        });

        it('should throw error when question not found for deletion', async () => {
            // Arrange
            Question.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                questionBankService.deleteQuestion(new ObjectId(), mockOwner._id)
            ).rejects.toThrow('Question not found');
        });

        it('should throw error when question is used in active tests', async () => {
            // Arrange
            Question.findOne.mockResolvedValue(mockQuestion);
            Test.countDocuments.mockResolvedValue(2); // Question is used in 2 tests

            // Act & Assert
            await expect(
                questionBankService.deleteQuestion(mockQuestion._id, mockOwner._id)
            ).rejects.toThrow('Cannot delete question: it is used in active tests');
        });

        it('should handle missing subject during deletion', async () => {
            // Arrange
            Question.findOne.mockResolvedValue(mockQuestion);
            Test.countDocuments.mockResolvedValue(0);
            Subject.findById.mockResolvedValue(null); // Subject not found
            mockQuestion.save.mockResolvedValue(mockQuestion);

            // Act
            const result = await questionBankService.deleteQuestion(mockQuestion._id, mockOwner._id);

            // Assert
            expect(result.success).toBe(true);
        });

        it('should handle database errors during deletion', async () => {
            // Arrange
            Question.findOne.mockResolvedValue(mockQuestion);
            Test.countDocuments.mockResolvedValue(0);
            mockQuestion.save.mockRejectedValue(new Error('Delete failed'));

            // Act & Assert
            await expect(
                questionBankService.deleteQuestion(mockQuestion._id, mockOwner._id)
            ).rejects.toThrow('Delete failed');
        });
    });

    describe('getQuestionsBySubject - Subject-based Retrieval', () => {
        it('should get questions by subject successfully', async () => {
            // Arrange
            const options = {
                difficulty: 'medium',
                type: 'multiple_choice',
                limit: 50
            };

            Question.findBySubject.mockResolvedValue(mockQuestions);

            // Act
            const result = await questionBankService.getQuestionsBySubject(mockSubject._id, mockOwner._id, options);

            // Assert
            expect(Question.findBySubject).toHaveBeenCalledWith(mockSubject._id, mockOwner._id, {
                difficulty: 'medium',
                type: 'multiple_choice',
                limit: 50
            });
            expect(result).toEqual(mockQuestions);
        });

        it('should filter out excluded questions', async () => {
            // Arrange
            const excludeIds = [mockQuestions[0]._id.toString()];
            Question.findBySubject.mockResolvedValue(mockQuestions);

            // Act
            const result = await questionBankService.getQuestionsBySubject(mockSubject._id, mockOwner._id, { excludeIds });

            // Assert
            expect(result).toHaveLength(2); // Should exclude first question
            expect(result.find(q => q._id.toString() === excludeIds[0])).toBeUndefined();
        });

        it('should handle database errors during subject retrieval', async () => {
            // Arrange
            Question.findBySubject.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(
                questionBankService.getQuestionsBySubject(mockSubject._id, mockOwner._id)
            ).rejects.toThrow('Database error');
        });
    });

    describe('autoSelectQuestions - Auto Selection', () => {
        it('should auto-select questions successfully', async () => {
            // Arrange
            const criteria = {
                subjectId: mockSubject._id,
                count: 5,
                difficulty: 'medium',
                type: 'multiple_choice',
                excludeIds: []
            };

            Subject.findOne.mockResolvedValue(mockSubject);
            Question.getRandomQuestions.mockResolvedValue(mockQuestions);
            Question.populate.mockResolvedValue(mockQuestions);

            // Act
            const result = await questionBankService.autoSelectQuestions(criteria, mockOwner._id);

            // Assert
            expect(Subject.findOne).toHaveBeenCalledWith({
                _id: mockSubject._id,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(Question.getRandomQuestions).toHaveBeenCalledWith({
                subjectId: mockSubject._id,
                ownerId: mockOwner._id,
                count: 5,
                difficulty: 'medium',
                type: 'multiple_choice',
                excludeIds: []
            });
            expect(Question.populate).toHaveBeenCalledWith(mockQuestions, [
                { path: 'subject', select: 'name code color' },
                { path: 'createdBy', select: 'firstName lastName' }
            ]);
            expect(result).toEqual(mockQuestions);
        });

        it('should throw error when subject not found for auto-selection', async () => {
            // Arrange
            Subject.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                questionBankService.autoSelectQuestions({ subjectId: new ObjectId() }, mockOwner._id)
            ).rejects.toThrow('Subject not found');
        });

        it('should handle database errors during auto-selection', async () => {
            // Arrange
            Subject.findOne.mockResolvedValue(mockSubject);
            Question.getRandomQuestions.mockRejectedValue(new Error('Random selection failed'));

            // Act & Assert
            await expect(
                questionBankService.autoSelectQuestions({ subjectId: mockSubject._id }, mockOwner._id)
            ).rejects.toThrow('Random selection failed');
        });
    });

    describe('previewAutoSelection - Selection Preview', () => {
        it('should preview auto-selection successfully', async () => {
            // Arrange
            const selectionConfig = [
                { subjectId: mockSubject._id, count: 10, difficulty: 'easy', type: 'multiple_choice' },
                { subjectId: new ObjectId(), count: 5, difficulty: 'hard', type: 'true_false' }
            ];

            const mockSubject2 = { ...mockSubject, _id: selectionConfig[1].subjectId, name: 'Physics' };

            Question.countDocuments.mockResolvedValueOnce(15); // First subject has 15 questions
            Question.countDocuments.mockResolvedValueOnce(3);  // Second subject has 3 questions

            // Mock autoSelectQuestions calls
            vi.spyOn(questionBankService, 'autoSelectQuestions')
                .mockResolvedValueOnce(mockQuestions.slice(0, 3))
                .mockResolvedValueOnce(mockQuestions.slice(0, 2));

            Subject.findById.mockResolvedValueOnce(mockSubject);
            Subject.findById.mockResolvedValueOnce(mockSubject2);

            // Act
            const result = await questionBankService.previewAutoSelection(selectionConfig, mockOwner._id);

            // Assert
            expect(result.preview).toHaveLength(2);
            expect(result.preview[0]).toMatchObject({
                subject: {
                    _id: mockSubject._id,
                    name: 'Mathematics',
                    code: 'MATH',
                    color: '#FF5722'
                },
                requestedCount: 10,
                availableCount: 15,
                canFulfill: true,
                difficulty: 'easy',
                type: 'multiple_choice'
            });
            expect(result.preview[1]).toMatchObject({
                requestedCount: 5,
                availableCount: 3,
                canFulfill: false
            });
            expect(result.summary).toMatchObject({
                totalRequestedQuestions: 15,
                totalAvailableQuestions: 13, // 10 (min of 10,15) + 3 (min of 5,3)
                canFulfillRequest: false
            });
        });

        it('should handle database errors during preview', async () => {
            // Arrange
            Question.countDocuments.mockRejectedValue(new Error('Count failed'));

            // Act & Assert
            await expect(
                questionBankService.previewAutoSelection([{ subjectId: mockSubject._id, count: 5 }], mockOwner._id)
            ).rejects.toThrow('Count failed');
        });
    });

    describe('searchQuestions - Advanced Search', () => {
        it('should search questions with basic query', async () => {
            // Arrange
            const searchOptions = {
                query: 'mathematics',
                limit: 10,
                offset: 0
            };

            const mockFindQuery = {
                populate: vi.fn().mockReturnThis(),
                sort: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                skip: vi.fn().mockResolvedValue(mockQuestions)
            };

            Question.find.mockReturnValue(mockFindQuery);
            Question.countDocuments.mockResolvedValue(25);

            // Act
            const result = await questionBankService.searchQuestions(mockOwner._id, searchOptions);

            // Assert
            expect(Question.find).toHaveBeenCalledWith({
                testCenterOwner: mockOwner._id,
                isActive: true,
                $text: { $search: 'mathematics' }
            });
            expect(mockFindQuery.populate).toHaveBeenCalledWith([
                { path: 'subject', select: 'name code color' },
                { path: 'createdBy', select: 'firstName lastName' }
            ]);
            expect(result).toEqual({
                questions: mockQuestions,
                pagination: {
                    limit: 10,
                    offset: 0,
                    total: 25,
                    hasMore: true
                }
            });
        });

        it('should search questions with advanced filters', async () => {
            // Arrange
            const searchOptions = {
                query: 'algebra',
                subjects: [mockSubject._id],
                types: ['multiple_choice', 'true_false'],
                difficulties: ['medium', 'hard'],
                keywords: ['math', 'equation'],
                hasMedia: true,
                limit: 15,
                offset: 10
            };

            const mockFindQuery = {
                populate: vi.fn().mockReturnThis(),
                sort: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                skip: vi.fn().mockResolvedValue(mockQuestions)
            };

            Question.find.mockReturnValue(mockFindQuery);
            Question.countDocuments.mockResolvedValue(50);

            // Act
            const result = await questionBankService.searchQuestions(mockOwner._id, searchOptions);

            // Assert
            expect(Question.find).toHaveBeenCalledWith({
                testCenterOwner: mockOwner._id,
                isActive: true,
                $text: { $search: 'algebra' },
                subject: { $in: [mockSubject._id] },
                type: { $in: ['multiple_choice', 'true_false'] },
                difficulty: { $in: ['medium', 'hard'] },
                keywords: { $in: ['math', 'equation'] },
                $or: [
                    { 'media.image': { $exists: true, $ne: null } },
                    { 'media.audio': { $exists: true, $ne: null } },
                    { 'media.video': { $exists: true, $ne: null } }
                ]
            });
        });

        it('should search questions without media', async () => {
            // Arrange
            const searchOptions = { hasMedia: false };

            const mockFindQuery = {
                populate: vi.fn().mockReturnThis(),
                sort: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                skip: vi.fn().mockResolvedValue(mockQuestions)
            };

            Question.find.mockReturnValue(mockFindQuery);
            Question.countDocuments.mockResolvedValue(10);

            // Act
            const result = await questionBankService.searchQuestions(mockOwner._id, searchOptions);

            // Assert
            expect(Question.find).toHaveBeenCalledWith({
                testCenterOwner: mockOwner._id,
                isActive: true,
                'media.image': { $exists: false },
                'media.audio': { $exists: false },
                'media.video': { $exists: false }
            });
        });

        it('should handle database errors during search', async () => {
            // Arrange
            Question.find.mockImplementation(() => {
                throw new Error('Search failed');
            });

            // Act & Assert
            await expect(
                questionBankService.searchQuestions(mockOwner._id, { query: 'test' })
            ).rejects.toThrow('Search failed');
        });
    });

    describe('duplicateQuestion - Question Duplication', () => {
        it('should duplicate question successfully', async () => {
            // Arrange
            const duplicatedQuestion = {
                ...mockQuestion,
                _id: new ObjectId(),
                questionText: 'What is 2 + 2? (Copy)',
                save: vi.fn().mockResolvedValue(),
                populate: vi.fn().mockResolvedValue()
            };

            Question.findOne.mockResolvedValue(mockQuestion);
            mockQuestion.duplicate.mockReturnValue(duplicatedQuestion);
            Subject.findById.mockResolvedValue(mockSubject);

            // Act
            const result = await questionBankService.duplicateQuestion(mockQuestion._id, mockOwner._id);

            // Assert
            expect(Question.findOne).toHaveBeenCalledWith({
                _id: mockQuestion._id,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(mockQuestion.duplicate).toHaveBeenCalled();
            expect(duplicatedQuestion.save).toHaveBeenCalled();
            expect(mockSubject.updateStats).toHaveBeenCalled();
            expect(duplicatedQuestion.populate).toHaveBeenCalledWith([
                { path: 'subject', select: 'name code color' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ]);
        });

        it('should duplicate question to different subject', async () => {
            // Arrange
            const newSubject = { ...mockSubject, _id: new ObjectId(), name: 'Physics' };
            const duplicatedQuestion = {
                ...mockQuestion,
                _id: new ObjectId(),
                save: vi.fn().mockResolvedValue(),
                populate: vi.fn().mockResolvedValue()
            };

            Question.findOne.mockResolvedValue(mockQuestion);
            mockQuestion.duplicate.mockReturnValue(duplicatedQuestion);
            Subject.findOne.mockResolvedValue(newSubject);
            Subject.findById.mockResolvedValue(newSubject);

            // Act
            const result = await questionBankService.duplicateQuestion(mockQuestion._id, mockOwner._id, newSubject._id);

            // Assert
            expect(Subject.findOne).toHaveBeenCalledWith({
                _id: newSubject._id,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(duplicatedQuestion.subject).toBe(newSubject._id);
        });

        it('should throw error when original question not found', async () => {
            // Arrange
            Question.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                questionBankService.duplicateQuestion(new ObjectId(), mockOwner._id)
            ).rejects.toThrow('Question not found');
        });

        it('should throw error when target subject not found', async () => {
            // Arrange
            Question.findOne.mockResolvedValue(mockQuestion);
            mockQuestion.duplicate.mockReturnValue({ ...mockQuestion });
            Subject.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                questionBankService.duplicateQuestion(mockQuestion._id, mockOwner._id, new ObjectId())
            ).rejects.toThrow('Target subject not found or access denied');
        });

        it('should handle database errors during duplication', async () => {
            // Arrange
            Question.findOne.mockResolvedValue(mockQuestion);
            mockQuestion.duplicate.mockImplementation(() => {
                throw new Error('Duplication failed');
            });

            // Act & Assert
            await expect(
                questionBankService.duplicateQuestion(mockQuestion._id, mockOwner._id)
            ).rejects.toThrow('Duplication failed');
        });
    });

    describe('getQuestionStatistics - Statistics and Analytics', () => {
        it('should get comprehensive question statistics', async () => {
            // Arrange
            const mockStats = [
                {
                    _id: { type: 'multiple_choice', difficulty: 'easy' },
                    count: 10,
                    totalUsage: 50,
                    avgScore: 85,
                    subjectInfo: [{ name: 'Mathematics' }]
                },
                {
                    _id: { type: 'true_false', difficulty: 'medium' },
                    count: 5,
                    totalUsage: 25,
                    avgScore: 75,
                    subjectInfo: [{ name: 'Physics' }]
                }
            ];

            Question.getQuestionStats.mockResolvedValue(mockStats);

            // Act
            const result = await questionBankService.getQuestionStatistics(mockOwner._id);

            // Assert
            expect(Question.getQuestionStats).toHaveBeenCalledWith(mockOwner._id);
            expect(result.totalQuestions).toBe(15);
            expect(result.byType).toEqual({
                'multiple_choice': 10,
                'true_false': 5
            });
            expect(result.byDifficulty).toEqual({
                'easy': 10,
                'medium': 5
            });
            expect(result.bySubject).toEqual({
                'Mathematics': 10,
                'Physics': 5
            });
            expect(result.averageUsage).toBe(5);
            expect(result.averageScore).toBeCloseTo(81.67, 1);
        });

        it('should handle empty statistics', async () => {
            // Arrange
            Question.getQuestionStats.mockResolvedValue([]);

            // Act
            const result = await questionBankService.getQuestionStatistics(mockOwner._id);

            // Assert
            expect(result).toEqual({
                totalQuestions: 0,
                byType: {},
                byDifficulty: {},
                bySubject: {},
                averageUsage: 0,
                averageScore: 0
            });
        });

        it('should handle database errors during statistics retrieval', async () => {
            // Arrange
            Question.getQuestionStats.mockRejectedValue(new Error('Stats failed'));

            // Act & Assert
            await expect(
                questionBankService.getQuestionStatistics(mockOwner._id)
            ).rejects.toThrow('Stats failed');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle concurrent operations gracefully', async () => {
            // Arrange
            User.findById.mockResolvedValue(mockOwner);
            Subject.findOne.mockResolvedValue(mockSubject);
            Question.findByOwner.mockResolvedValue(mockQuestions);
            Question.countDocuments.mockResolvedValue(10);

            const mockNewQuestion = {
                save: vi.fn().mockResolvedValue(mockQuestion),
                populate: vi.fn().mockResolvedValue(mockQuestion)
            };
            Question.mockImplementation(() => mockNewQuestion);

            // Act - Simulate concurrent operations
            const operations = [
                questionBankService.createQuestion({ subject: mockSubject._id }, mockOwner._id, mockOwner._id),
                questionBankService.getQuestions(mockOwner._id),
                questionBankService.createQuestion({ subject: mockSubject._id }, mockOwner._id, mockOwner._id)
            ];

            const results = await Promise.all(operations);

            // Assert
            expect(results).toHaveLength(3);
            expect(results[1].questions).toEqual(mockQuestions);
        });

        it('should handle invalid ObjectId gracefully', async () => {
            // Arrange
            const mockQuery = {
                populate: vi.fn().mockRejectedValue(new Error('Cast to ObjectId failed'))
            };
            Question.findOne.mockReturnValue(mockQuery);

            // Act & Assert
            await expect(
                questionBankService.getQuestionById('invalid-id', mockOwner._id)
            ).rejects.toThrow('Cast to ObjectId failed');
        });

        it('should handle network timeout errors', async () => {
            // Arrange
            Question.findByOwner.mockRejectedValue(new Error('Network timeout'));

            // Act & Assert
            await expect(
                questionBankService.getQuestions(mockOwner._id)
            ).rejects.toThrow('Network timeout');
        });

        it('should handle memory constraint errors during search', async () => {
            // Arrange
            Question.find.mockImplementation(() => {
                throw new Error('Memory exceeded');
            });

            // Act & Assert
            await expect(
                questionBankService.searchQuestions(mockOwner._id, { query: 'test' })
            ).rejects.toThrow('Memory exceeded');
        });
    });
});
