import { authService } from './service.js';
import { logger } from '../../config/logger.js';

class AuthController {
    constructor() {
        this.logger = logger;
        this.authService = authService;
    }

    register = async (req, res) => {
        try {
            this.logger.info('Auth register endpoint called');
            const userData = req.body;

            const result = await this.authService.register(userData);

            res.status(201).json({
                success: true,
                data: result
            });
        } catch (error) {
            this.logger.error('Registration failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Registration failed'
            });
        }
    };

    login = async (req, res) => {
        try {
            this.logger.info('Auth login endpoint called');
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide email and password'
                });
            }

            // Add request metadata for session tracking
            const userMetadata = {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent') || 'Unknown'
            };

            const result = await this.authService.login(email, password, userMetadata);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            this.logger.error('Login failed:', error);
            res.status(401).json({
                success: false,
                message: error.message || 'Invalid credentials'
            });
        }
    };

    logout = async (req, res) => {
        try {
            const userId = req.user?.id;
            const result = await this.authService.logout(userId);
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            this.logger.error('Logout failed:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Logout failed'
            });
        }
    };

    refreshToken = async (req, res) => {
        try {
            this.logger.info('Auth refresh token endpoint called');
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token is required'
                });
            }

            const result = await this.authService.refreshTokens(refreshToken);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            this.logger.error('Token refresh failed:', error);
            res.status(401).json({
                success: false,
                message: error.message || 'Token refresh failed'
            });
        }
    };

    requestPasswordReset = async (req, res) => {
        try {
            this.logger.info('Password reset request endpoint called');
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const result = await this.authService.requestPasswordReset(email);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            this.logger.error('Password reset request failed:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Password reset request failed'
            });
        }
    };

    resetPassword = async (req, res) => {
        try {
            this.logger.info('Password reset endpoint called');
            const { resetToken, newPassword } = req.body;

            if (!resetToken || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Reset token and new password are required'
                });
            }

            const result = await this.authService.resetPassword(resetToken, newPassword);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            this.logger.error('Password reset failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Password reset failed'
            });
        }
    };

    changePassword = async (req, res) => {
        try {
            this.logger.info('Change password endpoint called');
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password and new password are required'
                });
            }

            const result = await this.authService.changePassword(userId, currentPassword, newPassword);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            this.logger.error('Password change failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Password change failed'
            });
        }
    };

    getCurrentUser = async (req, res) => {
        try {
            this.logger.info('Auth get current user endpoint called');
            // req.user contains the JWT payload with user ID
            const userId = req.user.id;

            // Use service to get current user (business logic)
            const user = await this.authService.getCurrentUser(userId);

            res.json({
                success: true,
                data: {
                    user: user.toJSON()
                }
            });
        } catch (error) {
            this.logger.error('Get current user failed:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get current user'
            });
        }
    };
}

const authController = new AuthController();

export { authController };