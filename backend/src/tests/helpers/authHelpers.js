import jwt from 'jsonwebtoken';
import { createTestUser, createTokenData } from './testData.js';

// Authentication test helpers
export const createMockAuthService = () => ({
    generateTokens: jest.fn(),
    generateToken: jest.fn(),
    validateToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    logout: jest.fn(),
    revokeAllTokens: jest.fn(),
    checkAccountLockout: jest.fn(),
    handleFailedLogin: jest.fn()
});

// JWT token helpers
export const generateTestToken = (payload = {}, secret = 'test-secret', expiresIn = '1h') => {
    const defaultPayload = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'test_center_owner',
        ...payload
    };

    return jwt.sign(defaultPayload, secret, { expiresIn });
};

export const generateExpiredToken = (payload = {}) => {
    return generateTestToken(payload, 'test-secret', '-1h');
};

export const generateInvalidToken = () => {
    return 'invalid.jwt.token.format';
};

// User authentication state helpers
export const createAuthenticatedUser = (overrides = {}) => {
    const user = createTestUser(overrides);
    const tokens = {
        accessToken: generateTestToken({ id: user._id, email: user.email, role: user.role }),
        refreshToken: generateTestToken({ id: user._id, type: 'refresh' }, 'refresh-secret', '7d')
    };

    return { user, tokens };
};

// Mock request helpers
export const createMockRequest = (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides
});

export const createMockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
};

export const createAuthenticatedRequest = (user = null, overrides = {}) => {
    const testUser = user || createTestUser();
    const token = generateTestToken({ id: testUser._id, email: testUser.email, role: testUser.role });

    return createMockRequest({
        headers: {
            authorization: `Bearer ${token}`
        },
        user: testUser,
        ...overrides
    });
};

// Password helpers
export const createPasswordTestCases = () => ({
    valid: [
        'TestPass123!',
        'SecureP@ssw0rd',
        'MyP@ssword123',
        'Str0ng!P@ss'
    ],
    invalid: [
        '123456',           // Too short
        'password',         // No uppercase, numbers, symbols
        'PASSWORD',         // No lowercase, numbers, symbols
        'Password',         // No numbers, symbols
        'Password123',      // No symbols
        'Pass!',           // Too short
        '',                // Empty
        'a'.repeat(129)    // Too long
    ]
});

// Email validation helpers
export const createEmailTestCases = () => ({
    valid: [
        'test@example.com',
        'user.email@domain.co.uk',
        'firstname+lastname@example.com',
        'test123@test-domain.com'
    ],
    invalid: [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        'test@.com',
        '',
        'a'.repeat(250) + '@example.com' // Too long
    ]
});

// Rate limiting helpers
export const createRateLimitTestData = () => ({
    maxAttempts: 5,
    lockoutTime: 2 * 60 * 60 * 1000, // 2 hours
    attemptWindows: [1, 2, 3, 4, 5, 6] // Simulate login attempts
});

// Security test helpers
export const createSecurityTestCases = () => ({
    mongodbInjection: [
        '{"$ne": null}',
        '{"$regex": ".*"}',
        '{"$where": "this.password.length > 0"}',
        '{"$or": [{"password": {"$regex": ".*"}}]}'
    ],
    xss: [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>'
    ],
    pathTraversal: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'C:\\windows\\system32\\config\\sam'
    ]
});

// Authentication middleware test helpers
export const mockAuthMiddleware = (authenticatedUser = null) => {
    return (req, res, next) => {
        if (authenticatedUser) {
            req.user = authenticatedUser;
        }
        next();
    };
};

// Session helpers
export const createSessionData = (userId) => ({
    userId,
    lastActivity: new Date(),
    isActive: true,
    deviceInfo: {
        userAgent: 'test-browser',
        ipAddress: '127.0.0.1'
    }
});
