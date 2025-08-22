import { testService } from './service.js';
import { logger } from '../../config/logger.js';

class TestController {
    constructor() {
        this.testService = testService;
    }

    // Get all tests for the authenticated user's test center
    getTests = async (req, res) => {
        try {
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const options = {
                page: req.query.page || 1,
                limit: req.query.limit || 20,
                status: req.query.status,
                search: req.query.search,
                subject: req.query.subject,
                sort: req.query.sort || 'createdAt'
            };

            const result = await this.testService.getTestsByOwner(ownerId, options);

            res.status(200).json({
                success: true,
                data: result.tests,
                pagination: result.pagination
            });
        } catch (error) {
            logger.error('Get tests error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get tests'
            });
        }
    };

    // Get a specific test by ID
    getTestById = async (req, res) => {
        try {
            const { id } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const test = await this.testService.getTestById(id, ownerId);

            res.status(200).json({
                success: true,
                data: test
            });
        } catch (error) {
            logger.error('Get test by ID error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to get test'
            });
        }
    };

    // Create a new test
    createTest = async (req, res) => {
        try {
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const test = await this.testService.createTest(
                req.body,
                ownerId,
                req.user._id
            );

            res.status(201).json({
                success: true,
                message: 'Test created successfully',
                data: test
            });
        } catch (error) {
            logger.error('Create test error:', error);
            const statusCode = error.message.includes('subscription') ||
                error.message.includes('limit') ? 403 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to create test'
            });
        }
    };

    // Update an existing test
    updateTest = async (req, res) => {
        try {
            const { id } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const test = await this.testService.updateTest(
                id,
                req.body,
                ownerId,
                req.user._id
            );

            res.status(200).json({
                success: true,
                message: 'Test updated successfully',
                data: test
            });
        } catch (error) {
            logger.error('Update test error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update test'
            });
        }
    };

    // Delete a test
    deleteTest = async (req, res) => {
        try {
            const { id } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const result = await this.testService.deleteTest(id, ownerId);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            logger.error('Delete test error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to delete test'
            });
        }
    };

    // Get questions for a specific test
    getTestQuestions = async (req, res) => {
        try {
            const { testId } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const questions = await this.testService.getTestQuestions(testId, ownerId);

            res.status(200).json({
                success: true,
                data: questions
            });
        } catch (error) {
            logger.error('Get test questions error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to get test questions'
            });
        }
    };

    // Add a question to a test
    addQuestion = async (req, res) => {
        try {
            const { testId } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const question = await this.testService.addQuestionToTest(
                testId,
                req.body,
                ownerId,
                req.user._id
            );

            res.status(201).json({
                success: true,
                message: 'Question added to test successfully',
                data: question
            });
        } catch (error) {
            logger.error('Add question error:', error);
            const statusCode = error.message.includes('subscription') ||
                error.message.includes('limit') ? 403 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to add question to test'
            });
        }
    };

    // Update a question in a test
    updateQuestion = async (req, res) => {
        try {
            const { testId, questionId } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const question = await this.testService.updateQuestionInTest(
                testId,
                questionId,
                req.body,
                ownerId
            );

            res.status(200).json({
                success: true,
                message: 'Question updated successfully',
                data: question
            });
        } catch (error) {
            logger.error('Update question error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update question'
            });
        }
    };

    // Remove a question from a test
    deleteQuestion = async (req, res) => {
        try {
            const { testId, questionId } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const result = await this.testService.removeQuestionFromTest(
                testId,
                questionId,
                ownerId
            );

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            logger.error('Delete question error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to remove question from test'
            });
        }
    };

    // Import questions from Excel (placeholder)
    importFromExcel = async (req, res) => {
        logger.info('Import from Excel endpoint called');
        res.status(501).json({
            success: false,
            message: 'Excel import feature will be implemented in the next phase'
        });
    };

    // Get test with enrollment information
    getTestEnrollmentInfo = async (req, res) => {
        try {
            logger.info('Get test enrollment info endpoint called');
            const { id } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const result = await this.testService.getTestWithEnrollmentInfo(id, ownerId);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Get test enrollment info failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get test enrollment info'
            });
        }
    };

    // Update enrollment configuration
    updateEnrollmentConfig = async (req, res) => {
        try {
            logger.info('Update enrollment config endpoint called');
            const { id } = req.params;
            const enrollmentConfig = req.body;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const test = await this.testService.updateEnrollmentConfig(id, ownerId, enrollmentConfig);

            res.json({
                success: true,
                message: 'Enrollment configuration updated successfully',
                data: test
            });

        } catch (error) {
            logger.error('Update enrollment config failed:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update enrollment configuration'
            });
        }
    };

    // Start a test session (placeholder for student interface)
    startTest = async (req, res) => {
        logger.info('Start test endpoint called');
        res.status(501).json({
            success: false,
            message: 'Test session management will be implemented in the next phase'
        });
    };

    // Submit test answers (placeholder for student interface)
    submitTest = async (req, res) => {
        logger.info('Submit test endpoint called');
        res.status(501).json({
            success: false,
            message: 'Test submission will be implemented in the next phase'
        });
    };

    // Get test session details (placeholder for student interface)
    getTestSession = async (req, res) => {
        logger.info('Get test session endpoint called');
        res.status(501).json({
            success: false,
            message: 'Test session retrieval will be implemented in the next phase'
        });
    };
}

const testController = new TestController();

export { testController };