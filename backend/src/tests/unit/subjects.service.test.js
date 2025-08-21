import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { subjectService } from '../../modules/subjects/service.js';

const { ObjectId } = mongoose.Types;

// Mock the models
vi.mock('../../models/index.js', () => ({
    Subject: vi.fn(),
    Question: vi.fn(),
    Test: vi.fn(),
    User: vi.fn()
}));

// Mock logger
vi.mock('../../config/logger.js');

import { Subject, Question, Test, User } from '../../models/index.js';
import { logger } from '../../config/logger.js';

describe('SubjectService - Complete Coverage', () => {
    let mockOwner, mockCreator, mockSubject, mockSubjects;

    beforeEach(() => {
        vi.clearAllMocks();

        // Set up model static methods
        Subject.findOne = vi.fn();
        Subject.findByOwner = vi.fn();
        Subject.countDocuments = vi.fn();
        Subject.getCategories = vi.fn();
        Subject.bulkUpdateOrder = vi.fn();
        Subject.createDefault = vi.fn();
        Subject.getSubjectStats = vi.fn();

        Question.updateMany = vi.fn();
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
            email: 'creator@test.com'
        };

        mockSubject = {
            _id: new ObjectId(),
            name: 'Mathematics',
            category: 'Science',
            description: 'Basic mathematics',
            testCenterOwner: mockOwner._id,
            createdBy: mockCreator._id,
            isActive: true,
            order: 1,
            save: vi.fn(),
            populate: vi.fn(),
            toObject: vi.fn(),
            getQuestionsByDifficulty: vi.fn(),
            getQuestionsWithFilter: vi.fn(),
            updateStats: vi.fn(),
            canBeDeleted: vi.fn()
        };

        mockSubjects = [
            { ...mockSubject, name: 'Mathematics' },
            { ...mockSubject, _id: new ObjectId(), name: 'Physics' },
            { ...mockSubject, _id: new ObjectId(), name: 'Chemistry' }
        ];
    });

    describe('createSubject - Subject Creation', () => {
        it('should create subject successfully as test center owner', async () => {
            // Arrange
            const subjectData = {
                name: 'Biology',
                category: 'Science',
                description: 'Life sciences'
            };

            User.findById.mockResolvedValue(mockOwner);
            Subject.findOne.mockResolvedValue(null); // No duplicate

            const mockUser = {
                ...mockSubject,
                save: vi.fn().mockResolvedValue(mockSubject),
                populate: vi.fn().mockResolvedValue(mockSubject)
            };
            Subject.mockImplementation(() => mockUser);

            // Act
            const result = await subjectService.createSubject(subjectData, mockOwner._id, mockOwner._id);

            // Assert
            expect(User.findById).toHaveBeenCalledWith(mockOwner._id);
            expect(Subject.findOne).toHaveBeenCalledWith({
                testCenterOwner: mockOwner._id,
                name: { $regex: new RegExp(`^${subjectData.name}$`, 'i') },
                isActive: true
            });
            expect(Subject).toHaveBeenCalledWith({
                ...subjectData,
                testCenterOwner: mockOwner._id,
                createdBy: mockOwner._id
            });
            expect(mockUser.save).toHaveBeenCalled();
            expect(mockUser.populate).toHaveBeenCalledWith('createdBy', 'firstName lastName email');
        });

        it('should create subject successfully as test creator', async () => {
            // Arrange
            const subjectData = { name: 'Chemistry', category: 'Science' };

            User.findById.mockResolvedValue(mockCreator);
            Subject.findOne.mockResolvedValue(null);

            const mockUser = {
                save: vi.fn().mockResolvedValue(mockSubject),
                populate: vi.fn().mockResolvedValue(mockSubject)
            };
            Subject.mockImplementation(() => mockUser);

            // Act
            const result = await subjectService.createSubject(subjectData, mockOwner._id, mockCreator._id);

            // Assert
            expect(User.findById).toHaveBeenCalledWith(mockCreator._id);
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should throw error when creator not found', async () => {
            // Arrange
            User.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(
                subjectService.createSubject({ name: 'Test' }, mockOwner._id, new ObjectId())
            ).rejects.toThrow('Creator not found');
        });

        it('should throw error when test center owner has no permission', async () => {
            // Arrange
            const unauthorizedOwner = { ...mockOwner, _id: new ObjectId() };
            User.findById.mockResolvedValue(unauthorizedOwner);

            // Act & Assert
            await expect(
                subjectService.createSubject({ name: 'Test' }, mockOwner._id, unauthorizedOwner._id)
            ).rejects.toThrow('User does not have permission to create subjects for this test center');
        });

        it('should throw error when test creator has no permission', async () => {
            // Arrange
            const unauthorizedCreator = {
                ...mockCreator,
                testCenterOwner: new ObjectId()
            };
            User.findById.mockResolvedValue(unauthorizedCreator);

            // Act & Assert
            await expect(
                subjectService.createSubject({ name: 'Test' }, mockOwner._id, unauthorizedCreator._id)
            ).rejects.toThrow('User does not have permission to create subjects for this test center');
        });

        it('should throw error when subject name already exists', async () => {
            // Arrange
            User.findById.mockResolvedValue(mockOwner);
            Subject.findOne.mockResolvedValue(mockSubject); // Duplicate found

            // Act & Assert
            await expect(
                subjectService.createSubject({ name: 'Mathematics' }, mockOwner._id, mockOwner._id)
            ).rejects.toThrow('A subject with this name already exists');
        });

        it('should handle database errors during creation', async () => {
            // Arrange
            User.findById.mockResolvedValue(mockOwner);
            Subject.findOne.mockResolvedValue(null);

            const mockUser = {
                save: vi.fn().mockRejectedValue(new Error('Database error'))
            };
            Subject.mockImplementation(() => mockUser);

            // Act & Assert
            await expect(
                subjectService.createSubject({ name: 'Test' }, mockOwner._id, mockOwner._id)
            ).rejects.toThrow('Database error');
        });
    });

    describe('getSubjectsByOwner - Subject Listing', () => {
        it('should get subjects with default pagination', async () => {
            // Arrange
            Subject.findByOwner.mockResolvedValue(mockSubjects);
            Subject.countDocuments.mockResolvedValue(10);

            // Act
            const result = await subjectService.getSubjectsByOwner(mockOwner._id);

            // Assert
            expect(Subject.findByOwner).toHaveBeenCalledWith(mockOwner._id, {
                category: undefined,
                search: undefined,
                sort: { order: 1, name: 1 },
                limit: 50,
                skip: 0
            });
            expect(Subject.countDocuments).toHaveBeenCalledWith({
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(result).toEqual({
                subjects: mockSubjects,
                pagination: {
                    page: 1,
                    limit: 50,
                    total: 10,
                    pages: 1
                }
            });
        });

        it('should get subjects with custom pagination and filters', async () => {
            // Arrange
            const options = {
                page: 2,
                limit: 10,
                category: 'Science',
                search: 'math',
                sort: 'name'
            };

            Subject.findByOwner.mockResolvedValue(mockSubjects.slice(0, 1));
            Subject.countDocuments.mockResolvedValue(15);

            // Act
            const result = await subjectService.getSubjectsByOwner(mockOwner._id, options);

            // Assert
            expect(Subject.findByOwner).toHaveBeenCalledWith(mockOwner._id, {
                category: 'Science',
                search: 'math',
                sort: { name: 1, name: 1 },
                limit: 10,
                skip: 10
            });
            expect(Subject.countDocuments).toHaveBeenCalledWith({
                testCenterOwner: mockOwner._id,
                isActive: true,
                category: 'Science',
                $text: { $search: 'math' }
            });
            expect(result.pagination.pages).toBe(2);
        });

        it('should handle empty results', async () => {
            // Arrange
            Subject.findByOwner.mockResolvedValue([]);
            Subject.countDocuments.mockResolvedValue(0);

            // Act
            const result = await subjectService.getSubjectsByOwner(mockOwner._id);

            // Assert
            expect(result.subjects).toEqual([]);
            expect(result.pagination.total).toBe(0);
        });

        it('should handle database errors during listing', async () => {
            // Arrange
            Subject.findByOwner.mockRejectedValue(new Error('Database connection failed'));

            // Act & Assert
            await expect(
                subjectService.getSubjectsByOwner(mockOwner._id)
            ).rejects.toThrow('Database connection failed');
        });
    });

    describe('getSubjectById - Single Subject Retrieval', () => {
        it('should get subject with statistics successfully', async () => {
            // Arrange
            const questionStats = { easy: 5, medium: 3, hard: 2 };
            const recentQuestions = [{ name: 'Q1' }, { name: 'Q2' }];

            mockSubject.populate.mockResolvedValue(mockSubject);
            mockSubject.toObject.mockReturnValue({ ...mockSubject });
            mockSubject.getQuestionsByDifficulty.mockResolvedValue(questionStats);
            mockSubject.getQuestionsWithFilter.mockResolvedValue(recentQuestions);

            // Mock the chained findOne().populate() call
            const mockQuery = {
                populate: vi.fn().mockResolvedValue(mockSubject)
            };
            Subject.findOne.mockReturnValue(mockQuery);

            // Act
            const result = await subjectService.getSubjectById(mockSubject._id, mockOwner._id);

            // Assert
            expect(Subject.findOne).toHaveBeenCalledWith({
                _id: mockSubject._id,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(mockQuery.populate).toHaveBeenCalledWith([
                { path: 'createdBy', select: 'firstName lastName email' }
            ]);
            expect(mockSubject.getQuestionsByDifficulty).toHaveBeenCalled();
            expect(mockSubject.getQuestionsWithFilter).toHaveBeenCalledWith({
                limit: 5,
                sort: { createdAt: -1 }
            });
            expect(result.questionStats).toEqual(questionStats);
            expect(result.recentQuestions).toEqual(recentQuestions);
        });

        it('should throw error when subject not found', async () => {
            // Arrange
            const mockQuery = {
                populate: vi.fn().mockResolvedValue(null)
            };
            Subject.findOne.mockReturnValue(mockQuery);

            // Act & Assert
            await expect(
                subjectService.getSubjectById(new ObjectId(), mockOwner._id)
            ).rejects.toThrow('Subject not found or access denied');
        });

        it('should handle database errors during retrieval', async () => {
            // Arrange
            const mockQuery = {
                populate: vi.fn().mockRejectedValue(new Error('Database error'))
            };
            Subject.findOne.mockReturnValue(mockQuery);

            // Act & Assert
            await expect(
                subjectService.getSubjectById(mockSubject._id, mockOwner._id)
            ).rejects.toThrow('Database error');
        });
    });

    describe('updateSubject - Subject Updates', () => {
        it('should update subject successfully', async () => {
            // Arrange
            const updateData = {
                name: 'Advanced Mathematics',
                description: 'Updated description'
            };

            Subject.findOne.mockResolvedValueOnce(mockSubject); // First call for finding subject
            Subject.findOne.mockResolvedValueOnce(null); // Second call for duplicate check
            mockSubject.save.mockResolvedValue(mockSubject);
            mockSubject.updateStats.mockResolvedValue();
            mockSubject.populate.mockResolvedValue(mockSubject);

            // Act
            const result = await subjectService.updateSubject(mockSubject._id, updateData, mockOwner._id);

            // Assert
            expect(Subject.findOne).toHaveBeenNthCalledWith(1, {
                _id: mockSubject._id,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(Subject.findOne).toHaveBeenNthCalledWith(2, {
                testCenterOwner: mockOwner._id,
                name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
                isActive: true,
                _id: { $ne: mockSubject._id }
            });
            expect(mockSubject.save).toHaveBeenCalled();
            expect(mockSubject.updateStats).toHaveBeenCalled();
        });

        it('should update subject without name change', async () => {
            // Arrange
            const updateData = { description: 'New description only' };

            Subject.findOne.mockResolvedValue(mockSubject);
            mockSubject.save.mockResolvedValue(mockSubject);
            mockSubject.updateStats.mockResolvedValue();
            mockSubject.populate.mockResolvedValue(mockSubject);

            // Act
            const result = await subjectService.updateSubject(mockSubject._id, updateData, mockOwner._id);

            // Assert
            expect(Subject.findOne).toHaveBeenCalledTimes(1); // No duplicate check
            expect(mockSubject.save).toHaveBeenCalled();
        });

        it('should throw error when subject not found for update', async () => {
            // Arrange
            Subject.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                subjectService.updateSubject(new ObjectId(), { name: 'Test' }, mockOwner._id)
            ).rejects.toThrow('Subject not found or access denied');
        });

        it('should throw error when updated name already exists', async () => {
            // Arrange
            const updateData = { name: 'Physics' };
            const existingSubject = { ...mockSubject, name: 'Physics' };

            Subject.findOne.mockResolvedValueOnce(mockSubject);
            Subject.findOne.mockResolvedValueOnce(existingSubject); // Duplicate found

            // Act & Assert
            await expect(
                subjectService.updateSubject(mockSubject._id, updateData, mockOwner._id)
            ).rejects.toThrow('A subject with this name already exists');
        });

        it('should handle database errors during update', async () => {
            // Arrange
            const updateData = { name: 'Test Update' };

            Subject.findOne.mockResolvedValueOnce(mockSubject); // First call succeeds
            Subject.findOne.mockResolvedValueOnce(null); // Duplicate check passes
            mockSubject.save.mockRejectedValue(new Error('Save failed'));

            // Act & Assert
            await expect(
                subjectService.updateSubject(mockSubject._id, updateData, mockOwner._id)
            ).rejects.toThrow('Save failed');
        });
    });

    describe('deleteSubject - Subject Deletion', () => {
        it('should delete subject successfully', async () => {
            // Arrange
            Subject.findOne.mockResolvedValue(mockSubject);
            mockSubject.canBeDeleted.mockResolvedValue(true);
            mockSubject.save.mockResolvedValue(mockSubject);
            Question.updateMany.mockResolvedValue({ modifiedCount: 5 });

            // Act
            const result = await subjectService.deleteSubject(mockSubject._id, mockOwner._id);

            // Assert
            expect(Subject.findOne).toHaveBeenCalledWith({
                _id: mockSubject._id,
                testCenterOwner: mockOwner._id,
                isActive: true
            });
            expect(mockSubject.canBeDeleted).toHaveBeenCalled();
            expect(mockSubject.save).toHaveBeenCalled();
            expect(Question.updateMany).toHaveBeenCalledWith(
                { subject: mockSubject._id, testCenterOwner: mockOwner._id },
                { isActive: false }
            );
            expect(result).toEqual({
                success: true,
                message: 'Subject deleted successfully'
            });
        });

        it('should throw error when subject not found for deletion', async () => {
            // Arrange
            Subject.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                subjectService.deleteSubject(new ObjectId(), mockOwner._id)
            ).rejects.toThrow('Subject not found or access denied');
        });

        it('should throw error when subject cannot be deleted', async () => {
            // Arrange
            Subject.findOne.mockResolvedValue(mockSubject);
            mockSubject.canBeDeleted.mockResolvedValue(false);

            // Act & Assert
            await expect(
                subjectService.deleteSubject(mockSubject._id, mockOwner._id)
            ).rejects.toThrow('Cannot delete subject: it has active questions or is used in active tests');
        });

        it('should handle database errors during deletion', async () => {
            // Arrange
            Subject.findOne.mockResolvedValue(mockSubject);
            mockSubject.canBeDeleted.mockResolvedValue(true);
            mockSubject.save.mockRejectedValue(new Error('Delete failed'));

            // Act & Assert
            await expect(
                subjectService.deleteSubject(mockSubject._id, mockOwner._id)
            ).rejects.toThrow('Delete failed');
        });
    });

    describe('getCategories - Category Management', () => {
        it('should get categories successfully', async () => {
            // Arrange
            const mockCategories = ['Science', 'Mathematics', 'Languages'];
            Subject.getCategories.mockResolvedValue(mockCategories);

            // Act
            const result = await subjectService.getCategories(mockOwner._id);

            // Assert
            expect(Subject.getCategories).toHaveBeenCalledWith(mockOwner._id);
            expect(result).toEqual(mockCategories);
        });

        it('should handle database errors during category retrieval', async () => {
            // Arrange
            Subject.getCategories.mockRejectedValue(new Error('Categories fetch failed'));

            // Act & Assert
            await expect(
                subjectService.getCategories(mockOwner._id)
            ).rejects.toThrow('Categories fetch failed');
        });
    });

    describe('updateSubjectOrder - Order Management', () => {
        it('should update subject order successfully', async () => {
            // Arrange
            const orderUpdates = [
                { id: mockSubject._id, order: 1 },
                { id: new ObjectId(), order: 2 }
            ];
            Subject.bulkUpdateOrder.mockResolvedValue({ modifiedCount: 2 });

            // Act
            const result = await subjectService.updateSubjectOrder(mockOwner._id, orderUpdates);

            // Assert
            expect(Subject.bulkUpdateOrder).toHaveBeenCalledWith(mockOwner._id, orderUpdates);
            expect(result).toEqual({
                success: true,
                message: 'Subject order updated successfully',
                modifiedCount: 2
            });
        });

        it('should handle database errors during order update', async () => {
            // Arrange
            Subject.bulkUpdateOrder.mockRejectedValue(new Error('Order update failed'));

            // Act & Assert
            await expect(
                subjectService.updateSubjectOrder(mockOwner._id, [])
            ).rejects.toThrow('Order update failed');
        });
    });

    describe('createDefaultSubjects - Default Subject Creation', () => {
        it('should create default subjects successfully', async () => {
            // Arrange
            const defaultSubjects = [
                { name: 'Mathematics', category: 'Core' },
                { name: 'English', category: 'Core' }
            ];
            Subject.createDefault.mockResolvedValue(defaultSubjects);

            // Act
            const result = await subjectService.createDefaultSubjects(mockOwner._id, mockCreator._id);

            // Assert
            expect(Subject.createDefault).toHaveBeenCalledWith(mockOwner._id, mockCreator._id);
            expect(result).toEqual(defaultSubjects);
        });

        it('should handle database errors during default creation', async () => {
            // Arrange
            Subject.createDefault.mockRejectedValue(new Error('Default creation failed'));

            // Act & Assert
            await expect(
                subjectService.createDefaultSubjects(mockOwner._id, mockCreator._id)
            ).rejects.toThrow('Default creation failed');
        });
    });

    describe('getSubjectStatistics - Statistics and Analytics', () => {
        it('should get subject statistics successfully', async () => {
            // Arrange
            const mockStats = [
                { _id: 'Science', count: 3, totalQuestions: 15, totalTests: 2 },
                { _id: 'Mathematics', count: 2, totalQuestions: 10, totalTests: 1 }
            ];
            Subject.getSubjectStats.mockResolvedValue(mockStats);

            // Act
            const result = await subjectService.getSubjectStatistics(mockOwner._id);

            // Assert
            expect(Subject.getSubjectStats).toHaveBeenCalledWith(mockOwner._id);
            expect(result).toEqual({
                totalSubjects: 5,
                totalQuestions: 25,
                totalTests: 3,
                categoriesBreakdown: {
                    'Science': { subjects: 3, questions: 15, tests: 2 },
                    'Mathematics': { subjects: 2, questions: 10, tests: 1 }
                }
            });
        });

        it('should handle empty statistics', async () => {
            // Arrange
            Subject.getSubjectStats.mockResolvedValue([]);

            // Act
            const result = await subjectService.getSubjectStatistics(mockOwner._id);

            // Assert
            expect(result).toEqual({
                totalSubjects: 0,
                totalQuestions: 0,
                totalTests: 0,
                categoriesBreakdown: {}
            });
        });

        it('should handle database errors during statistics retrieval', async () => {
            // Arrange
            Subject.getSubjectStats.mockRejectedValue(new Error('Stats fetch failed'));

            // Act & Assert
            await expect(
                subjectService.getSubjectStatistics(mockOwner._id)
            ).rejects.toThrow('Stats fetch failed');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle concurrent operations gracefully', async () => {
            // Arrange
            User.findById.mockResolvedValue(mockOwner);
            Subject.findOne.mockResolvedValue(null);
            Subject.getCategories.mockResolvedValue(['Science']);

            const mockUser = {
                save: vi.fn().mockResolvedValue(mockSubject),
                populate: vi.fn().mockResolvedValue(mockSubject)
            };
            Subject.mockImplementation(() => mockUser);

            // Act - Simulate concurrent operations
            const operations = [
                subjectService.createSubject({ name: 'Math1' }, mockOwner._id, mockOwner._id),
                subjectService.getCategories(mockOwner._id),
                subjectService.createSubject({ name: 'Math2' }, mockOwner._id, mockOwner._id)
            ];

            const results = await Promise.all(operations);

            // Assert
            expect(results).toHaveLength(3);
            expect(results[1]).toEqual(['Science']);
        });

        it('should handle invalid ObjectId gracefully', async () => {
            // Arrange
            const invalidId = 'invalid-object-id';
            const mockQuery = {
                populate: vi.fn().mockRejectedValue(new Error('Cast to ObjectId failed'))
            };
            Subject.findOne.mockReturnValue(mockQuery);

            // Act & Assert
            await expect(
                subjectService.getSubjectById(invalidId, mockOwner._id)
            ).rejects.toThrow('Cast to ObjectId failed');
        });

        it('should handle network timeout errors', async () => {
            // Arrange
            Subject.findByOwner.mockRejectedValue(new Error('Network timeout'));

            // Act & Assert
            await expect(
                subjectService.getSubjectsByOwner(mockOwner._id)
            ).rejects.toThrow('Network timeout');
        });

        it('should handle memory constraint errors during bulk operations', async () => {
            // Arrange
            Subject.bulkUpdateOrder.mockRejectedValue(new Error('Insufficient memory'));

            // Act & Assert
            await expect(
                subjectService.updateSubjectOrder(mockOwner._id, [])
            ).rejects.toThrow('Insufficient memory');
        });
    });
});
