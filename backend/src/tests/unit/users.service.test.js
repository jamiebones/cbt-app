import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { userService } from '../../modules/users/service.js';
import { createTestUser } from '../helpers/testData.js';

const { ObjectId } = mongoose.Types;

// Mock the models
vi.mock('../../models/index.js', () => ({
    User: vi.fn()
}));

// Mock logger
vi.mock('../../config/logger.js');

import { User } from '../../models/index.js';
import { logger } from '../../config/logger.js';

describe('UserService - Complete Coverage', () => {
    let mockTestCenterOwner, mockTestCreator, mockStudent, mockUsers;

    beforeEach(() => {
        vi.clearAllMocks();

        // Set up User static methods as mocks
        User.findById = vi.fn();
        User.findByEmail = vi.fn();
        User.findOne = vi.fn();
        User.find = vi.fn();
        User.countDocuments = vi.fn();
        User.findByIdAndUpdate = vi.fn();
        User.findByIdAndDelete = vi.fn();
        User.findTestCenterOwners = vi.fn();
        User.findStudentsByOwner = vi.fn();
        User.getSubscriptionStats = vi.fn();

        // Create comprehensive mock users
        mockTestCenterOwner = {
            _id: new ObjectId(),
            email: 'owner@test.com',
            firstName: 'John',
            lastName: 'Owner',
            role: 'test_center_owner',
            testCenterName: 'Tech Training Center',
            subscriptionTier: 'premium',
            subscriptionLimits: {
                maxTests: -1,
                maxStudentsPerTest: -1,
                maxQuestionsPerTest: -1,
                canImportExcel: true,
                canUseAnalytics: true
            },
            isActive: true,
            isEmailVerified: true,
            save: vi.fn().mockResolvedValue(true)
        };

        mockTestCreator = {
            _id: new ObjectId(),
            email: 'creator@test.com',
            firstName: 'Jane',
            lastName: 'Creator',
            role: 'test_creator',
            testCenterOwner: mockTestCenterOwner._id,
            isActive: true,
            isEmailVerified: true,
            save: vi.fn().mockResolvedValue(true)
        };

        mockStudent = {
            _id: new ObjectId(),
            email: 'student@test.com',
            firstName: 'Bob',
            lastName: 'Student',
            role: 'student',
            studentRegNumber: 'STU001',
            testCenterOwner: mockTestCenterOwner._id,
            isActive: true,
            isEmailVerified: false,
            save: vi.fn().mockResolvedValue(true)
        };

        mockUsers = [mockTestCenterOwner, mockTestCreator, mockStudent];
    });

    describe('findById - User Lookup', () => {
        it('should find user by ID successfully', async () => {
            // Arrange
            User.findById.mockResolvedValue(mockTestCenterOwner);

            // Act
            const result = await userService.findById(mockTestCenterOwner._id);

            // Assert
            expect(User.findById).toHaveBeenCalledWith(mockTestCenterOwner._id);
            expect(result).toEqual(mockTestCenterOwner);
        });

        it('should throw error when database operation fails', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            User.findById.mockRejectedValue(dbError);

            // Act & Assert
            await expect(
                userService.findById(mockTestCenterOwner._id)
            ).rejects.toThrow('Database connection failed');
        });

        it('should return null when user not found', async () => {
            // Arrange
            User.findById.mockResolvedValue(null);

            // Act
            const result = await userService.findById(new ObjectId());

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('findByEmail - Email Lookup', () => {
        it('should find user by email successfully', async () => {
            // Arrange
            User.findByEmail.mockResolvedValue(mockTestCenterOwner);

            // Act
            const result = await userService.findByEmail('owner@test.com');

            // Assert
            expect(User.findByEmail).toHaveBeenCalledWith('owner@test.com');
            expect(result).toEqual(mockTestCenterOwner);
        });

        it('should handle email case insensitivity', async () => {
            // Arrange
            User.findByEmail.mockResolvedValue(mockTestCenterOwner);

            // Act
            const result = await userService.findByEmail('OWNER@TEST.COM');

            // Assert
            expect(User.findByEmail).toHaveBeenCalledWith('OWNER@TEST.COM');
            expect(result).toEqual(mockTestCenterOwner);
        });

        it('should throw error when database operation fails', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            User.findByEmail.mockRejectedValue(dbError);

            // Act & Assert
            await expect(
                userService.findByEmail('owner@test.com')
            ).rejects.toThrow('Database connection failed');
        });
    });

    describe('findByStudentId - Student Lookup', () => {
        it('should find student by student ID successfully', async () => {
            // Arrange
            User.findOne.mockResolvedValue(mockStudent);

            // Act
            const result = await userService.findByStudentId('STU001');

            // Assert
            expect(User.findOne).toHaveBeenCalledWith({ studentId: 'STU001' });
            expect(result).toEqual(mockStudent);
        });

        it('should throw error when database operation fails', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            User.findOne.mockRejectedValue(dbError);

            // Act & Assert
            await expect(
                userService.findByStudentId('STU001')
            ).rejects.toThrow('Database connection failed');
        });

        it('should return null when student not found', async () => {
            // Arrange
            User.findOne.mockResolvedValue(null);

            // Act
            const result = await userService.findByStudentId('NONEXISTENT');

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('create - User Creation', () => {
        it('should create test center owner successfully', async () => {
            // Arrange
            const userData = {
                firstName: 'Test',
                lastName: 'Owner',
                email: 'testowner@test.com',
                password: 'password123',
                role: 'test_center_owner'
            };

            const mockUser = {
                _id: new ObjectId(),
                ...userData,
                save: vi.fn().mockResolvedValue({
                    _id: new ObjectId(),
                    ...userData,
                    createdAt: new Date()
                })
            };

            User.mockImplementation(() => mockUser);

            // Act
            const result = await userService.create(userData);

            // Assert
            expect(User).toHaveBeenCalledWith(userData);
            expect(mockUser.save).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.email).toBe(userData.email);
        });

        it('should create test creator successfully', async () => {
            // Arrange
            const userData = {
                email: 'newcreator@test.com',
                password: 'password123',
                firstName: 'New',
                lastName: 'Creator',
                role: 'test_creator',
                testCenterOwner: mockTestCenterOwner._id
            };

            const mockUser = {
                _id: new ObjectId(),
                ...userData,
                save: vi.fn().mockResolvedValue({
                    _id: new ObjectId(),
                    ...userData,
                    createdAt: new Date()
                })
            };

            User.mockImplementation(() => mockUser);

            // Act
            const result = await userService.create(userData);

            // Assert
            expect(User).toHaveBeenCalledWith(userData);
            expect(mockUser.save).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.role).toBe('test_creator');
        });

        it('should create student successfully', async () => {
            // Arrange
            const userData = {
                email: 'newstudent@test.com',
                password: 'password123',
                firstName: 'New',
                lastName: 'Student',
                role: 'student',
                studentRegNumber: 'STU002',
                testCenterOwner: mockTestCenterOwner._id
            };

            const mockUser = {
                _id: new ObjectId(),
                ...userData,
                save: vi.fn().mockResolvedValue({
                    _id: new ObjectId(),
                    ...userData,
                    createdAt: new Date()
                })
            };

            User.mockImplementation(() => mockUser);

            // Act
            const result = await userService.create(userData);

            // Assert
            expect(User).toHaveBeenCalledWith(userData);
            expect(mockUser.save).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.role).toBe('student');
        });

        it('should throw error when user creation fails', async () => {
            // Arrange
            const userData = {
                email: 'invalid-email',
                password: '123', // Too short
                firstName: 'Test',
                lastName: 'User',
                role: 'student'
            };

            const mockUser = {
                save: vi.fn().mockRejectedValue(new Error('Validation failed'))
            };

            User.mockImplementation(() => mockUser);

            // Act & Assert
            await expect(
                userService.create(userData)
            ).rejects.toThrow('Validation failed');
        });
    });

    describe('update - User Updates', () => {
        it('should update user successfully', async () => {
            // Arrange
            const updateData = {
                firstName: 'Updated',
                lastName: 'Name',
                phoneNumber: '+1234567890'
            };

            const updatedUser = {
                ...mockTestCenterOwner,
                ...updateData
            };

            User.findByIdAndUpdate.mockResolvedValue(updatedUser);

            // Act
            const result = await userService.update(mockTestCenterOwner._id, updateData);

            // Assert
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                mockTestCenterOwner._id,
                updateData,
                { new: true, runValidators: true }
            );
            expect(result).toEqual(updatedUser);
        });

        it('should throw error when update fails', async () => {
            // Arrange
            const updateData = { email: 'invalid-email' };
            const validationError = new Error('Validation failed');
            User.findByIdAndUpdate.mockRejectedValue(validationError);

            // Act & Assert
            await expect(
                userService.update(mockTestCenterOwner._id, updateData)
            ).rejects.toThrow('Validation failed');
        });

        it('should return null when user not found for update', async () => {
            // Arrange
            const updateData = { firstName: 'Updated' };
            User.findByIdAndUpdate.mockResolvedValue(null);

            // Act
            const result = await userService.update(new ObjectId(), updateData);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('delete - User Deletion', () => {
        it('should delete user successfully', async () => {
            // Arrange
            User.findByIdAndDelete.mockResolvedValue(mockTestCenterOwner);

            // Act
            const result = await userService.delete(mockTestCenterOwner._id);

            // Assert
            expect(User.findByIdAndDelete).toHaveBeenCalledWith(mockTestCenterOwner._id);
            expect(result).toEqual(mockTestCenterOwner);
        });

        it('should throw error when deletion fails', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            User.findByIdAndDelete.mockRejectedValue(dbError);

            // Act & Assert
            await expect(
                userService.delete(mockTestCenterOwner._id)
            ).rejects.toThrow('Database connection failed');
        });

        it('should return null when user not found for deletion', async () => {
            // Arrange
            User.findByIdAndDelete.mockResolvedValue(null);

            // Act
            const result = await userService.delete(new ObjectId());

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('listUsers - User Listing with Pagination', () => {
        it('should list users with default pagination', async () => {
            // Arrange
            const mockQuery = {
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue(mockUsers)
            };

            User.find.mockReturnValue(mockQuery);
            User.countDocuments.mockResolvedValue(3);

            // Act
            const result = await userService.listUsers();

            // Assert
            expect(User.find).toHaveBeenCalledWith({});
            expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(mockQuery.skip).toHaveBeenCalledWith(0);
            expect(mockQuery.limit).toHaveBeenCalledWith(10);
            expect(User.countDocuments).toHaveBeenCalledWith({});

            expect(result).toEqual({
                users: mockUsers,
                pagination: {
                    current: 1,
                    pages: 1,
                    total: 3
                }
            });
        });

        it('should list users with custom pagination and filters', async () => {
            // Arrange
            const filters = { role: 'student' };
            const options = { page: 2, limit: 5, sort: { firstName: 1 } };

            const mockQuery = {
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([mockStudent])
            };

            User.find.mockReturnValue(mockQuery);
            User.countDocuments.mockResolvedValue(10);

            // Act
            const result = await userService.listUsers(filters, options);

            // Assert
            expect(User.find).toHaveBeenCalledWith(filters);
            expect(mockQuery.sort).toHaveBeenCalledWith(options.sort);
            expect(mockQuery.skip).toHaveBeenCalledWith(5); // (page 2 - 1) * limit 5
            expect(mockQuery.limit).toHaveBeenCalledWith(5);

            expect(result).toEqual({
                users: [mockStudent],
                pagination: {
                    current: 2,
                    pages: 2, // 10 total / 5 limit
                    total: 10
                }
            });
        });

        it('should handle empty results', async () => {
            // Arrange
            const mockQuery = {
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([])
            };

            User.find.mockReturnValue(mockQuery);
            User.countDocuments.mockResolvedValue(0);

            // Act
            const result = await userService.listUsers({ role: 'nonexistent' });

            // Assert
            expect(result).toEqual({
                users: [],
                pagination: {
                    current: 1,
                    pages: 0,
                    total: 0
                }
            });
        });

        it('should throw error when listing fails', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            User.find.mockImplementation(() => {
                throw dbError;
            });

            // Act & Assert
            await expect(
                userService.listUsers()
            ).rejects.toThrow('Database connection failed');
        });
    });

    describe('findTestCenterOwners - Owner Lookup', () => {
        it('should find all test center owners successfully', async () => {
            // Arrange
            const owners = [mockTestCenterOwner];
            User.findTestCenterOwners.mockResolvedValue(owners);

            // Act
            const result = await userService.findTestCenterOwners();

            // Assert
            expect(User.findTestCenterOwners).toHaveBeenCalled();
            expect(result).toEqual(owners);
        });

        it('should throw error when operation fails', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            User.findTestCenterOwners.mockRejectedValue(dbError);

            // Act & Assert
            await expect(
                userService.findTestCenterOwners()
            ).rejects.toThrow('Database connection failed');
        });

        it('should return empty array when no owners found', async () => {
            // Arrange
            User.findTestCenterOwners.mockResolvedValue([]);

            // Act
            const result = await userService.findTestCenterOwners();

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('findStudentsByOwner - Student Lookup by Owner', () => {
        it('should find students by owner successfully', async () => {
            // Arrange
            const students = [mockStudent];
            User.findStudentsByOwner.mockResolvedValue(students);

            // Act
            const result = await userService.findStudentsByOwner(mockTestCenterOwner._id);

            // Assert
            expect(User.findStudentsByOwner).toHaveBeenCalledWith(mockTestCenterOwner._id);
            expect(result).toEqual(students);
        });

        it('should throw error when operation fails', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            User.findStudentsByOwner.mockRejectedValue(dbError);

            // Act & Assert
            await expect(
                userService.findStudentsByOwner(mockTestCenterOwner._id)
            ).rejects.toThrow('Database connection failed');
        });

        it('should return empty array when no students found', async () => {
            // Arrange
            User.findStudentsByOwner.mockResolvedValue([]);

            // Act
            const result = await userService.findStudentsByOwner(mockTestCenterOwner._id);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('updateSubscription - Subscription Management', () => {
        it('should update subscription successfully', async () => {
            // Arrange
            const subscriptionData = {
                tier: 'premium',
                expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
                limits: {
                    maxTests: -1,
                    maxStudentsPerTest: -1,
                    maxQuestionsPerTest: -1,
                    canImportExcel: true,
                    canUseAnalytics: true
                }
            };

            const updatedUser = {
                ...mockTestCenterOwner,
                subscriptionTier: subscriptionData.tier,
                subscriptionExpiry: subscriptionData.expiry,
                subscriptionLimits: subscriptionData.limits
            };

            User.findByIdAndUpdate.mockResolvedValue(updatedUser);

            // Act
            const result = await userService.updateSubscription(mockTestCenterOwner._id, subscriptionData);

            // Assert
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                mockTestCenterOwner._id,
                {
                    subscriptionTier: subscriptionData.tier,
                    subscriptionExpiry: subscriptionData.expiry,
                    subscriptionLimits: subscriptionData.limits
                },
                { new: true, runValidators: true }
            );
            expect(result).toEqual(updatedUser);
        });

        it('should throw error when subscription update fails', async () => {
            // Arrange
            const subscriptionData = {
                tier: 'invalid_tier',
                expiry: new Date(),
                limits: {}
            };

            const validationError = new Error('Invalid subscription tier');
            User.findByIdAndUpdate.mockRejectedValue(validationError);

            // Act & Assert
            await expect(
                userService.updateSubscription(mockTestCenterOwner._id, subscriptionData)
            ).rejects.toThrow('Invalid subscription tier');
        });

        it('should return null when user not found for subscription update', async () => {
            // Arrange
            const subscriptionData = {
                tier: 'premium',
                expiry: new Date(),
                limits: {}
            };

            User.findByIdAndUpdate.mockResolvedValue(null);

            // Act
            const result = await userService.updateSubscription(new ObjectId(), subscriptionData);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('getSubscriptionStats - Subscription Analytics', () => {
        it('should get subscription statistics successfully', async () => {
            // Arrange
            const expectedStats = [
                {
                    _id: 'free',
                    count: 10,
                    activeUsers: 8
                },
                {
                    _id: 'premium',
                    count: 5,
                    activeUsers: 5
                }
            ];

            User.getSubscriptionStats.mockResolvedValue(expectedStats);

            // Act
            const result = await userService.getSubscriptionStats();

            // Assert
            expect(User.getSubscriptionStats).toHaveBeenCalled();
            expect(result).toEqual(expectedStats);
        });

        it('should throw error when stats operation fails', async () => {
            // Arrange
            const dbError = new Error('Aggregation failed');
            User.getSubscriptionStats.mockRejectedValue(dbError);

            // Act & Assert
            await expect(
                userService.getSubscriptionStats()
            ).rejects.toThrow('Aggregation failed');
        });

        it('should handle empty stats result', async () => {
            // Arrange
            User.getSubscriptionStats.mockResolvedValue([]);

            // Act
            const result = await userService.getSubscriptionStats();

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('getUserCount - User Counting', () => {
        it('should get user count with no filters', async () => {
            // Arrange
            User.countDocuments.mockResolvedValue(15);

            // Act
            const result = await userService.getUserCount();

            // Assert
            expect(User.countDocuments).toHaveBeenCalledWith({});
            expect(result).toBe(15);
        });

        it('should get user count with filters', async () => {
            // Arrange
            const filters = { role: 'student', isActive: true };
            User.countDocuments.mockResolvedValue(8);

            // Act
            const result = await userService.getUserCount(filters);

            // Assert
            expect(User.countDocuments).toHaveBeenCalledWith(filters);
            expect(result).toBe(8);
        });

        it('should throw error when count operation fails', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            User.countDocuments.mockRejectedValue(dbError);

            // Act & Assert
            await expect(
                userService.getUserCount()
            ).rejects.toThrow('Database connection failed');
        });

        it('should return zero when no users match filters', async () => {
            // Arrange
            User.countDocuments.mockResolvedValue(0);

            // Act
            const result = await userService.getUserCount({ role: 'nonexistent' });

            // Assert
            expect(result).toBe(0);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle concurrent operations gracefully', async () => {
            // Arrange
            User.findById.mockResolvedValue(mockTestCenterOwner);
            User.findByEmail.mockResolvedValue(mockTestCreator);
            User.findOne.mockResolvedValue(mockStudent);

            // Act - Run multiple operations concurrently
            const promises = [
                userService.findById(mockTestCenterOwner._id),
                userService.findByEmail('creator@test.com'),
                userService.findByStudentId('STU001')
            ];

            const results = await Promise.all(promises);

            // Assert
            expect(results).toHaveLength(3);
            expect(results[0]).toEqual(mockTestCenterOwner);
            expect(results[1]).toEqual(mockTestCreator);
            expect(results[2]).toEqual(mockStudent);
        });

        it('should handle invalid ObjectId gracefully', async () => {
            // Arrange
            const invalidIdError = new Error('Cast to ObjectId failed');
            User.findById.mockRejectedValue(invalidIdError);

            // Act & Assert
            await expect(
                userService.findById('invalid-id')
            ).rejects.toThrow('Cast to ObjectId failed');
        });

        it('should handle network timeout errors', async () => {
            // Arrange
            const timeoutError = new Error('Network timeout');
            User.find.mockImplementation(() => {
                throw timeoutError;
            });

            // Act & Assert
            await expect(
                userService.listUsers()
            ).rejects.toThrow('Network timeout');
        });

        it('should handle memory constraint errors during listing', async () => {
            // Arrange
            const memoryError = new Error('Memory limit exceeded');
            const mockQuery = {
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockRejectedValue(memoryError)
            };

            User.find.mockReturnValue(mockQuery);

            // Act & Assert
            await expect(
                userService.listUsers({}, { limit: 10000 })
            ).rejects.toThrow('Memory limit exceeded');
        });
    });
});
