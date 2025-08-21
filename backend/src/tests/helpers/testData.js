import mongoose from 'mongoose';
import { vi } from 'vitest';

// Helper functions for generating test data
const generateObjectId = () => Math.random().toString(36).substring(2, 15);

// Test user data generators
export const createTestUser = (overrides = {}) => {
    const user = {
        id: generateObjectId(),
        _id: generateObjectId(),
        email: 'test@example.com',
        password: 'hashedPassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'test_center_owner',
        testCenterName: 'Test Center',
        subscriptionTier: 'free',
        subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        loginAttempts: 0,
        accountLockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Add mock methods
        toJSON: function () {
            const obj = { ...this };
            delete obj.password; // Remove password from JSON
            delete obj.toJSON; // Remove methods
            delete obj.save;
            delete obj.comparePassword;
            delete obj.incrementLoginAttempts;
            delete obj.resetLoginAttempts;
            delete obj.createPasswordResetToken;
            return obj;
        },
        save: vi.fn().mockResolvedValue(this),
        comparePassword: vi.fn(),
        incrementLoginAttempts: vi.fn(),
        resetLoginAttempts: vi.fn(),
        createPasswordResetToken: vi.fn(),
        ...overrides
    };

    // Ensure methods are bound to the user object
    user.save = vi.fn().mockResolvedValue(user);

    return user;
};

export const createTestCreator = (testCenterOwnerId) => ({
    _id: new mongoose.Types.ObjectId(),
    firstName: 'Test',
    lastName: 'Creator',
    email: 'creator@example.com',
    password: 'TestPass123!',
    role: 'test_creator',
    testCenterOwner: testCenterOwnerId,
    isActive: true,
    isEmailVerified: true
});

export const createTestStudent = () => ({
    _id: new mongoose.Types.ObjectId(),
    firstName: 'Test',
    lastName: 'Student',
    email: 'student@example.com',
    password: 'TestPass123!',
    role: 'student',
    isActive: true,
    isEmailVerified: true
});

// Test subject data
export const createTestSubject = (ownerId, overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    name: 'Mathematics',
    code: 'MATH101',
    description: 'Basic Mathematics',
    testCenterOwner: ownerId,
    createdBy: ownerId,
    isActive: true,
    stats: {
        questionCount: 0,
        testCount: 0,
        averageDifficulty: 'medium'
    },
    ...overrides
});

// Test question data
export const createTestQuestion = (subjectId, ownerId, overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    questionText: 'What is 2 + 2?',
    type: 'multiple_choice',
    difficulty: 'easy',
    points: 10,
    subject: subjectId,
    testCenterOwner: ownerId,
    createdBy: ownerId,
    isActive: true,
    answers: [
        { id: 'A', text: '3', isCorrect: false },
        { id: 'B', text: '4', isCorrect: true },
        { id: 'C', text: '5', isCorrect: false },
        { id: 'D', text: '6', isCorrect: false }
    ],
    ...overrides
});

// Test data
export const createTestData = (ownerId, overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    title: 'Sample Math Test',
    description: 'A basic mathematics test',
    duration: 30, // minutes
    passingScore: 70,
    totalQuestions: 5,
    testCenterOwner: ownerId,
    createdBy: ownerId,
    status: 'draft',
    ...overrides
});

// Authentication data
export const createAuthData = () => ({
    validEmail: 'test@example.com',
    validPassword: 'TestPass123!',
    invalidEmail: 'invalid-email',
    invalidPassword: '123',
    nonExistentEmail: 'nonexistent@example.com',
    wrongPassword: 'WrongPassword123!'
});

// JWT token data
export const createTokenData = (userId) => ({
    payload: {
        id: userId,
        email: 'test@example.com',
        role: 'test_center_owner',
        subscriptionTier: 'free'
    },
    validToken: 'valid.jwt.token',
    invalidToken: 'invalid.jwt.token',
    expiredToken: 'expired.jwt.token'
});

// Password reset data
export const createPasswordResetData = () => ({
    email: 'test@example.com',
    resetToken: 'valid-reset-token',
    invalidResetToken: 'invalid-reset-token',
    expiredResetToken: 'expired-reset-token',
    newPassword: 'NewPassword123!'
});

// Error messages
export const ERROR_MESSAGES = {
    USER_NOT_FOUND: 'User not found',
    INVALID_CREDENTIALS: 'Invalid email or password',
    INVALID_TOKEN: 'Invalid token',
    EXPIRED_TOKEN: 'Token has expired',
    EMAIL_EXISTS: 'Email already exists',
    WEAK_PASSWORD: 'Password must be at least 8 characters',
    INVALID_EMAIL: 'Please provide a valid email',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    VALIDATION_ERROR: 'Validation failed'
};

// Success messages
export const SUCCESS_MESSAGES = {
    USER_CREATED: 'User created successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    PASSWORD_RESET: 'Password reset successful',
    PASSWORD_CHANGED: 'Password changed successfully',
    EMAIL_SENT: 'Email sent successfully'
};
