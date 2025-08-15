const { logger } = require('../../config/logger');

class UserController {
    getUsers = async (req, res) => {
        logger.info('Get users endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get users not implemented yet'
        });
    };

    getUserById = async (req, res) => {
        logger.info('Get user by ID endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get user by ID not implemented yet'
        });
    };

    createUser = async (req, res) => {
        logger.info('Create user endpoint called');
        res.status(501).json({
            success: false,
            message: 'Create user not implemented yet'
        });
    };

    updateUser = async (req, res) => {
        logger.info('Update user endpoint called');
        res.status(501).json({
            success: false,
            message: 'Update user not implemented yet'
        });
    };

    deleteUser = async (req, res) => {
        logger.info('Delete user endpoint called');
        res.status(501).json({
            success: false,
            message: 'Delete user not implemented yet'
        });
    };

    getUsersByCenter = async (req, res) => {
        logger.info('Get users by center endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get users by center not implemented yet'
        });
    };

    createTestCreator = async (req, res) => {
        logger.info('Create test creator endpoint called');
        res.status(501).json({
            success: false,
            message: 'Create test creator not implemented yet'
        });
    };

    registerStudent = async (req, res) => {
        logger.info('Register student endpoint called');
        res.status(501).json({
            success: false,
            message: 'Register student not implemented yet'
        });
    };
}

const userController = new UserController();

module.exports = { userController };