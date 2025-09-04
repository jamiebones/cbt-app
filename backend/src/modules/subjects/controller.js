import { subjectService } from './service.js';
import { logger } from '../../config/logger.js';
import { USER_ROLES } from '../../utils/constants.js';

class SubjectController {
    constructor() {
        this.subjectService = subjectService;
    }

    // Get all subjects for the authenticated user's test center
    getSubjects = async (req, res) => {
        try {
            const ownerId = req.user.role === USER_ROLES.TEST_CENTER_OWNER
                ? req.user._id
                : req.user.testCenterOwner;

            const options = {
                page: req.query.page || 1,
                limit: req.query.limit || 50,
                category: req.query.category,
                search: req.query.search,
                sort: req.query.sort || 'order'
            };

            const result = await this.subjectService.getSubjectsByOwner(ownerId, options);

            res.status(200).json({
                success: true,
                data: result.subjects,
                pagination: result.pagination
            });
        } catch (error) {
            logger.error('Get subjects error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get subjects'
            });
        }
    };

    // Get a specific subject by ID
    getSubjectById = async (req, res) => {
        try {
            const { id } = req.params;
            const ownerId = req.user.role === USER_ROLES.TEST_CENTER_OWNER
                ? req.user._id
                : req.user.testCenterOwner;

            const subject = await this.subjectService.getSubjectById(id, ownerId);

            res.status(200).json({
                success: true,
                data: subject
            });
        } catch (error) {
            logger.error('Get subject by ID error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to get subject'
            });
        }
    };

    // Create a new subject
    createSubject = async (req, res) => {
        try {
            const ownerId = req.user.role === USER_ROLES.TEST_CENTER_OWNER
                ? req.user._id
                : req.user.testCenterOwner;

            const subject = await this.subjectService.createSubject(
                req.body,
                ownerId,
                req.user._id
            );

            res.status(201).json({
                success: true,
                message: 'Subject created successfully',
                data: subject
            });
        } catch (error) {
            logger.error('Create subject error:', error);
            const statusCode = error.message.includes('already exists') ? 409 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to create subject'
            });
        }
    };

    // Update an existing subject
    updateSubject = async (req, res) => {
        try {
            const { id } = req.params;
            const ownerId = req.user.role === USER_ROLES.TEST_CENTER_OWNER
                ? req.user._id
                : req.user.testCenterOwner;

            const subject = await this.subjectService.updateSubject(
                id,
                req.body,
                ownerId
            );

            res.status(200).json({
                success: true,
                message: 'Subject updated successfully',
                data: subject
            });
        } catch (error) {
            logger.error('Update subject error:', error);
            const statusCode = error.message.includes('not found') ? 404 :
                error.message.includes('already exists') ? 409 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update subject'
            });
        }
    };

    // Delete a subject
    deleteSubject = async (req, res) => {
        try {
            const { id } = req.params;
            const ownerId = req.user.role === USER_ROLES.TEST_CENTER_OWNER
                ? req.user._id
                : req.user.testCenterOwner;

            const result = await this.subjectService.deleteSubject(id, ownerId);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            logger.error('Delete subject error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to delete subject'
            });
        }
    };

    // Get subject categories
    getCategories = async (req, res) => {
        try {
            const ownerId = req.user.role === USER_ROLES.TEST_CENTER_OWNER
                ? req.user._id
                : req.user.testCenterOwner;

            const categories = await this.subjectService.getCategories(ownerId);

            res.status(200).json({
                success: true,
                data: categories
            });
        } catch (error) {
            logger.error('Get categories error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get categories'
            });
        }
    };

    // Update subject order (for drag-and-drop)
    updateSubjectOrder = async (req, res) => {
        try {
            const ownerId = req.user.role === USER_ROLES.TEST_CENTER_OWNER
                ? req.user._id
                : req.user.testCenterOwner;

            const { orderUpdates } = req.body;

            if (!orderUpdates || !Array.isArray(orderUpdates)) {
                return res.status(400).json({
                    success: false,
                    message: 'orderUpdates array is required'
                });
            }

            const result = await this.subjectService.updateSubjectOrder(ownerId, orderUpdates);

            res.status(200).json({
                success: true,
                message: result.message,
                data: { modifiedCount: result.modifiedCount }
            });
        } catch (error) {
            logger.error('Update subject order error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update subject order'
            });
        }
    };

    // Create default subjects for new test centers
    createDefaultSubjects = async (req, res) => {
        try {
            const ownerId = req.user.role === USER_ROLES.TEST_CENTER_OWNER
                ? req.user._id
                : req.user.testCenterOwner;

            const subjects = await this.subjectService.createDefaultSubjects(ownerId, req.user._id);

            res.status(201).json({
                success: true,
                message: 'Default subjects created successfully',
                data: subjects
            });
        } catch (error) {
            logger.error('Create default subjects error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create default subjects'
            });
        }
    };

    // Get subject statistics
    getSubjectStatistics = async (req, res) => {
        try {
            const ownerId = req.user.role === USER_ROLES.TEST_CENTER_OWNER
                ? req.user._id
                : req.user.testCenterOwner;

            const statistics = await this.subjectService.getSubjectStatistics(ownerId);

            res.status(200).json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('Get subject statistics error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get subject statistics'
            });
        }
    };
}

const subjectController = new SubjectController();

export { subjectController };
