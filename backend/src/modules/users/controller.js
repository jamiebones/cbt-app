import { logger } from '../../config/logger.js';
import userService from './service.js';

class UserController {
    getUsers = async (req, res) => {
        logger.info('Get users endpoint called');

        try {
            // Check if user is super_admin
            if (req.user.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Super admin privileges required.'
                });
            }

            const { page = 1, limit = 10, role } = req.query;

            let filter = {};
            if (role) {
                filter.role = role;
            }

            const result = await userService.listUsers(filter, { page: parseInt(page), limit: parseInt(limit) });

            res.json({
                success: true,
                data: result.users.map(user => ({
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    phoneNumber: user.phoneNumber,
                    testCenterName: user.testCenterName,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                })),
                pagination: result.pagination
            });
        } catch (error) {
            logger.error('Get users failed:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get users'
            });
        }
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

        try {
            const testCenterOwnerId = req.user.id;
            // Verify the user is a test center owner
            if (req.user.role !== 'test_center_owner') {
                return res.status(403).json({
                    success: false,
                    message: 'Only test center owners can create test creators'
                });
            }
            const testCreatorData = req.body;
            const newTestCreator = await userService.createTestCreator(testCreatorData, testCenterOwnerId);
            res.status(201).json({
                success: true,
                message: 'Test creator created successfully',
                data: {
                    id: newTestCreator.id,
                    email: newTestCreator.email,
                    firstName: newTestCreator.firstName,
                    lastName: newTestCreator.lastName,
                    role: newTestCreator.role,
                    createdAt: newTestCreator.createdAt
                }
            });
        } catch (error) {
            logger.error('Create test creator failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create test creator'
            });
        }
    };

    createTestCenterOwner = async (req, res) => {
        logger.info('Create test center owner endpoint called');

        try {
            // Verify the user is a super_admin
            if (req.user.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Only super admins can create test center owners'
                });
            }

            const testCenterOwnerData = req.body;
            const newTestCenterOwner = await userService.createTestCenterOwner(testCenterOwnerData);

            res.status(201).json({
                success: true,
                message: 'Test center owner created successfully',
                data: {
                    id: newTestCenterOwner.id,
                    email: newTestCenterOwner.email,
                    firstName: newTestCenterOwner.firstName,
                    lastName: newTestCenterOwner.lastName,
                    phoneNumber: newTestCenterOwner.phoneNumber,
                    testCenterName: newTestCenterOwner.testCenterName,
                    testCenterAddress: newTestCenterOwner.testCenterAddress,
                    role: newTestCenterOwner.role,
                    createdAt: newTestCenterOwner.createdAt
                }
            });
        } catch (error) {
            logger.error('Create test center owner failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create test center owner'
            });
        }
    };

    registerStudent = async (req, res) => {
        logger.info('Register student endpoint called');
        res.status(501).json({
            success: false,
            message: 'Register student not implemented yet'
        });
    };

    getTestCenterOwners = async (req, res) => {
        logger.info('Get test center owners endpoint called');

        try {
            // Check if user is super_admin
            if (req.user.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Super admin privileges required.'
                });
            }

            const testCenterOwners = await userService.findTestCenterOwners();

            res.json({
                success: true,
                data: testCenterOwners.map(owner => ({
                    id: owner.id,
                    email: owner.email,
                    firstName: owner.firstName,
                    lastName: owner.lastName,
                    phoneNumber: owner.phoneNumber,
                    testCenterName: owner.testCenterName,
                    testCenterAddress: owner.testCenterAddress,
                    subscriptionTier: owner.subscriptionTier,
                    isActive: owner.isActive,
                    createdAt: owner.createdAt,
                    updatedAt: owner.updatedAt
                }))
            });
        } catch (error) {
            logger.error('Get test center owners failed:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get test center owners'
            });
        }
    };

    getTestCreatorsByOwner = async (req, res) => {
        logger.info('Get test creators by owner endpoint called');

        try {
            const testCenterOwnerId = req.user.id;

            // Verify the user is a test center owner
            if (req.user.role !== 'test_center_owner') {
                return res.status(403).json({
                    success: false,
                    message: 'Only test center owners can view test creators'
                });
            }

            const testCreators = await userService.findTestCreatorsByOwner(testCenterOwnerId);

            res.json({
                success: true,
                data: testCreators.map(creator => ({
                    id: creator.id,
                    email: creator.email,
                    firstName: creator.firstName,
                    lastName: creator.lastName,
                    phoneNumber: creator.phoneNumber,
                    role: creator.role,
                    isActive: creator.isActive,
                    createdAt: creator.createdAt,
                    updatedAt: creator.updatedAt
                }))
            });
        } catch (error) {
            logger.error('Get test creators by owner failed:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get test creators'
            });
        }
    };

    deleteTestCreator = async (req, res) => {
        logger.info('Delete test creator endpoint called');

        try {
            const testCenterOwnerId = req.user.id;
            const { testCreatorId } = req.params;

            // Verify the user is a test center owner
            if (req.user.role !== 'test_center_owner') {
                return res.status(403).json({
                    success: false,
                    message: 'Only test center owners can delete test creators'
                });
            }

            const result = await userService.deleteTestCreator(testCreatorId, testCenterOwnerId);

            res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            logger.error('Delete test creator failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to delete test creator'
            });
        }
    };
}

const userController = new UserController();

export { userController };