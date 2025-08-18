import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../../models/index.js';
import { logger } from '../../config/logger.js';

class AuthService {
    constructor() {
        // JWT Configuration
        this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
        this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
        this.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

        // Security settings
        this.MAX_LOGIN_ATTEMPTS = 5;
        this.LOCKOUT_TIME = 2 * 60 * 60 * 1000; // 2 hours
        this.PASSWORD_RESET_EXPIRES = 10 * 60 * 1000; // 10 minutes
    }

    // JWT Token generation
    async generateTokens(user) {
        logger.info(`Generating tokens for user: ${user.id}`);

        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            subscriptionTier: user.subscriptionTier,
            testCenterOwner: user.testCenterOwner
        };

        // Generate access token (short-lived)
        const accessToken = jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRES_IN,
            issuer: 'cbt-app',
            audience: 'cbt-users'
        });

        // Generate refresh token (long-lived)
        const refreshToken = jwt.sign(
            { id: user.id, type: 'refresh' },
            this.JWT_REFRESH_SECRET,
            {
                expiresIn: this.JWT_REFRESH_EXPIRES_IN,
                issuer: 'cbt-app',
                audience: 'cbt-users'
            }
        );

        return {
            accessToken,
            refreshToken,
            expiresIn: this.JWT_EXPIRES_IN
        };
    }

    async generateToken(user) {
        // Backward compatibility method
        const tokens = await this.generateTokens(user);
        return tokens.accessToken;
    }

    // Token validation
    async validateToken(token) {
        try {
            logger.debug('Validating access token');
            const decoded = jwt.verify(token, this.JWT_SECRET, {
                issuer: 'cbt-app',
                audience: 'cbt-users'
            });

            const user = await User.findById(decoded.id);
            if (!user || !user.isActive) {
                logger.warn(`Token validation failed: User not found or inactive - ${decoded.id}`);
                return null;
            }

            return user;
        } catch (error) {
            logger.error('Token validation failed:', error.message);
            return null;
        }
    }

    async validateRefreshToken(refreshToken) {
        try {
            logger.debug('Validating refresh token');
            const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET, {
                issuer: 'cbt-app',
                audience: 'cbt-users'
            });

            if (decoded.type !== 'refresh') {
                logger.warn('Invalid refresh token type');
                return null;
            }

            const user = await User.findById(decoded.id);
            if (!user || !user.isActive) {
                logger.warn(`Refresh token validation failed: User not found or inactive - ${decoded.id}`);
                return null;
            }

            return user;
        } catch (error) {
            logger.error('Refresh token validation failed:', error.message);
            return null;
        }
    }

    // Registration
    async register(userData) {
        logger.info('Registering new user', { email: userData.email, role: userData.role });

        try {
            // Validate required fields based on role
            this.validateRegistrationData(userData);

            // Check if user already exists
            const existingUser = await User.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Check student ID uniqueness for students
            if (userData.role === 'student' && userData.studentId) {
                const existingStudent = await User.findOne({ studentId: userData.studentId });
                if (existingStudent) {
                    throw new Error('Student ID already exists');
                }
            }

            // Create user
            const user = new User(userData);
            await user.save();

            logger.info('User registered successfully', { userId: user.id, email: user.email });

            // Generate tokens
            const tokens = await this.generateTokens(user);

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            return {
                user: user.toJSON(),
                ...tokens
            };

        } catch (error) {
            logger.error('Registration failed:', error.message);
            throw error;
        }
    }

    // Login
    async login(email, password) {
        logger.info('Attempting login', { email });

        try {
            // Find user by email
            const user = await User.findByEmail(email);
            if (!user) {
                logger.warn('Login failed: User not found', { email });
                throw new Error('Invalid email or password');
            }

            // Check if account is locked
            if (user.isLocked) {
                logger.warn('Login failed: Account locked', { email });
                throw new Error('Account is temporarily locked due to too many failed login attempts');
            }

            // Check if account is active
            if (!user.isActive) {
                logger.warn('Login failed: Account inactive', { email });
                throw new Error('Account is deactivated');
            }

            // Verify password
            const isValidPassword = await user.comparePassword(password);
            if (!isValidPassword) {
                logger.warn('Login failed: Invalid password', { email });
                await user.incrementLoginAttempts();
                throw new Error('Invalid email or password');
            }

            // Reset login attempts on successful login
            if (user.loginAttempts > 0) {
                await user.resetLoginAttempts();
            }

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            logger.info('Login successful', { userId: user.id, email });

            // Generate tokens
            const tokens = await this.generateTokens(user);

            return {
                user: user.toJSON(),
                ...tokens
            };

        } catch (error) {
            logger.error('Login failed:', error.message);
            throw error;
        }
    }

    // Refresh token
    async refreshTokens(refreshToken) {
        logger.info('Refreshing tokens');

        try {
            const user = await this.validateRefreshToken(refreshToken);
            if (!user) {
                throw new Error('Invalid refresh token');
            }

            // Generate new tokens
            const tokens = await this.generateTokens(user);

            logger.info('Tokens refreshed successfully', { userId: user.id });

            return {
                user: user.toJSON(),
                ...tokens
            };

        } catch (error) {
            logger.error('Token refresh failed:', error.message);
            throw error;
        }
    }

    // Password reset
    async requestPasswordReset(email) {
        logger.info('Password reset requested', { email });

        try {
            const user = await User.findByEmail(email);
            if (!user) {
                // Don't reveal if user exists
                logger.warn('Password reset requested for non-existent user', { email });
                return { message: 'If an account with that email exists, a password reset link has been sent.' };
            }

            const resetToken = user.createPasswordResetToken();
            await user.save();

            logger.info('Password reset token generated', { userId: user.id });

            // In a real app, you would send an email here
            // For now, return the token (in production, don't return this!)
            return {
                message: 'Password reset link has been sent to your email.',
                resetToken // Remove this in production
            };

        } catch (error) {
            logger.error('Password reset request failed:', error.message);
            throw error;
        }
    }

    async resetPassword(resetToken, newPassword) {
        logger.info('Password reset attempted');

        try {
            const user = await User.findOne({
                passwordResetToken: resetToken,
                passwordResetExpires: { $gt: Date.now() }
            });

            if (!user) {
                throw new Error('Invalid or expired password reset token');
            }

            // Update password
            user.password = newPassword;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            user.loginAttempts = 0;
            user.accountLockedUntil = undefined;

            await user.save();

            logger.info('Password reset successful', { userId: user.id });

            return { message: 'Password has been reset successfully' };

        } catch (error) {
            logger.error('Password reset failed:', error.message);
            throw error;
        }
    }

    // Change password (for logged-in users)
    async changePassword(userId, currentPassword, newPassword) {
        logger.info('Password change requested', { userId });

        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isValidPassword = await user.comparePassword(currentPassword);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }

            // Update password
            user.password = newPassword;
            await user.save();

            logger.info('Password changed successfully', { userId });

            return { message: 'Password changed successfully' };

        } catch (error) {
            logger.error('Password change failed:', error.message);
            throw error;
        }
    }

    // Logout (invalidate tokens - would require token blacklist in production)
    async logout(userId) {
        logger.info('User logged out', { userId });
        // In a full implementation, you would add the token to a blacklist
        return { message: 'Logged out successfully' };
    }

    // Validation helpers
    validateRegistrationData(userData) {
        const { email, password, firstName, lastName, role } = userData;

        if (!email || !password || !firstName || !lastName || !role) {
            throw new Error('All required fields must be provided');
        }

        // Role-specific validation
        if (role === 'test_center_owner' && !userData.testCenterName) {
            throw new Error('Test center name is required for test center owners');
        }

        if (role === 'student') {
            if (!userData.studentId) {
                throw new Error('Student ID is required for students');
            }
            if (!userData.testCenterOwner) {
                throw new Error('Students must be associated with a test center owner');
            }
        }

        if (role === 'test_creator' && !userData.testCenterOwner) {
            throw new Error('Test creators must be associated with a test center owner');
        }
    }

    // Utility methods
    generatePasswordResetToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Permission checking
    checkPermission(user, permission) {
        if (!user) {
            return false;
        }

        return user.hasPermission ? user.hasPermission(permission) : false;
    }

    // Subscription checking
    checkSubscriptionAccess(user, feature) {
        if (!user || !user.isSubscriptionActive || !user.isSubscriptionActive()) {
            return false;
        }

        const featureMap = {
            'excel_import': 'canImportExcel',
            'analytics': 'canUseAnalytics'
        };

        const limitKey = featureMap[feature];
        if (!limitKey) {
            return true; // Feature not subscription-restricted
        }

        return user.subscriptionLimits?.[limitKey] || false;
    }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
