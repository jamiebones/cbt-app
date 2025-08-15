import { container } from '../../config/container.js';

class AuthController {
    constructor() {
        this.logger = container.get('logger');
        this.authService = container.get('authService');
    }

    register = async (req, res) => {
        try {
            this.logger.info('Auth register endpoint called');
            const { email, password, name } = req.body;

            if (!email || !password || !name) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide email, password and name'
                });
            }

            const { user, token } = await this.authService.register({ email, password, name });

            res.status(201).json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name
                    },
                    token
                }
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

            const { user, token } = await this.authService.login(email, password);

            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name
                    },
                    token
                }
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
        // Since we're using JWT, we don't need to do anything server-side
        // The client should remove the token
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    };

    refreshToken = async (req, res) => {
        try {
            this.logger.info('Auth refresh token endpoint called');
            const userId = req.user.id; // From auth middleware
            const token = await this.authService.refreshToken(userId);

            res.json({
                success: true,
                data: { token }
            });
        } catch (error) {
            this.logger.error('Token refresh failed:', error);
            res.status(401).json({
                success: false,
                message: error.message || 'Token refresh failed'
            });
        }
    };

    getCurrentUser = async (req, res) => {
        try {
            this.logger.info('Auth get current user endpoint called');
            // req.user is set by auth middleware
            const user = req.user;

            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name
                    }
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