import mongoose from 'mongoose';
import { vi } from 'vitest';

// Helper functions for generating test data
const generateObjectId = () => Math.random().toString(36).substring(2, 15);

// Test user data generators
export const createTestUser = async (overrides = {}) => {
    const { User } = await import('../../models/index.js');

    const userData = {
        email: overrides.email || 'test@example.com',
        password: 'hashedPassword123',
        firstName: overrides.firstName || 'Test',
        lastName: overrides.lastName || 'User',
        role: overrides.role || 'test_center_owner',
        testCenterName: 'Test Center',
        subscriptionTier: 'free',
        subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        loginAttempts: 0,
        accountLockedUntil: null,
        ...overrides
    };

    return await User.create(userData);
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

// Test data (async versions that work with actual models)
export const createTestSubject = async (overrides = {}) => {
    const { Subject } = await import('../../models/index.js');

    const subjectData = {
        name: overrides.name || 'Test Subject',
        description: overrides.description || 'A test subject',
        testCenterOwner: overrides.testCenterOwner,
        isActive: true,
        ...overrides
    };

    return await Subject.create(subjectData);
};

export const createTestQuestion = async (overrides = {}) => {
    const { Question } = await import('../../models/index.js');

    const questionData = {
        questionText: overrides.questionText || 'Sample question?',
        type: overrides.type || 'multiple_choice',
        options: overrides.options || ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: overrides.correctAnswer !== undefined ? overrides.correctAnswer : 0,
        points: overrides.points || 1,
        subject: overrides.subject,
        testCenterOwner: overrides.testCenterOwner,
        difficulty: overrides.difficulty || 'medium',
        tags: overrides.tags || [],
        explanation: overrides.explanation || 'Sample explanation',
        isActive: true,
        ...overrides
    };

    return await Question.create(questionData);
};

export const createTestTest = async (overrides = {}) => {
    const { Test } = await import('../../models/index.js');

    const testData = {
        title: overrides.title || 'Sample Test',
        description: overrides.description || 'A sample test for testing purposes',
        duration: overrides.duration || 60, // minutes
        totalQuestions: overrides.totalQuestions || 10,
        passingScore: overrides.passingScore || 70,
        questionSelectionMethod: overrides.questionSelectionMethod || 'manual',
        questions: overrides.questions || [],
        subjects: overrides.subjects || [],
        testCenterOwner: overrides.testCenterOwner,
        createdBy: overrides.createdBy,
        status: overrides.status || 'draft',
        isActive: true,
        ...overrides
    };

    return await Test.create(testData);
};

// Authentication data

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

// Analytics test data generators
export const createTestAnalyticsData = () => {
    const testId = generateObjectId();
    return {
        testId,
        test: {
            _id: testId,
            title: 'Basic Math Test',
            description: 'Test covering basic arithmetic',
            totalQuestions: 10,
            passingScore: 70
        },
        basicStats: [{
            totalAttempts: 5,
            completedAttempts: 4,
            averageScore: 75.5,
            highestScore: 95,
            lowestScore: 45,
            passRate: 0.75,
            averageDuration: 1800,
            abandonmentRate: 0.2
        }]
    };
};

export const createCenterData = () => {
    const centerId = generateObjectId();
    return {
        centerId,
        center: {
            _id: centerId,
            firstName: 'Center',
            lastName: 'Owner',
            email: 'owner@test.com',
            businessName: 'Test Center'
        },
        stats: [{
            totalSessions: 15,
            completedSessions: 12,
            averageScore: 78.5,
            passRate: 0.75,
            totalTests: 3,
            totalStudents: 8
        }]
    };
};

export const createStudentData = () => {
    const studentId = generateObjectId();
    const centerId = generateObjectId();
    return {
        studentId,
        centerId,
        student: {
            _id: studentId,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@test.com'
        },
        stats: [{
            totalAttempts: 5,
            averageScore: 82.5,
            highestScore: 95,
            passRate: 80,
            totalDuration: 9000
        }]
    };
};

export const createDashboardData = () => {
    const centerId = generateObjectId();
    return {
        centerId,
        stats: [{
            recentActivity: [
                { type: 'test_completed', details: 'Math Test', timestamp: new Date() },
                { type: 'student_registered', details: 'John Doe', timestamp: new Date() }
            ],
            performanceMetrics: {
                totalTests: 10,
                totalStudents: 50,
                averageScore: 78.5,
                completionRate: 85
            }
        }]
    };
};
