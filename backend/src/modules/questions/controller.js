import { questionBankService } from './service.js';
import { logger } from '../../config/logger.js';

class QuestionController {
    constructor() {
        this.questionBankService = questionBankService;
    }

    // Get all questions with filtering and pagination
    getQuestions = async (req, res) => {
        try {
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const options = {
                page: req.query.page || 1,
                limit: req.query.limit || 20,
                subject: req.query.subject,
                type: req.query.type,
                difficulty: req.query.difficulty,
                search: req.query.search,
                keywords: req.query.keywords,
                topic: req.query.topic,
                createdBy: req.query.createdBy,
                sort: req.query.sort || 'createdAt'
            };

            const result = await this.questionBankService.getQuestions(ownerId, options);

            res.status(200).json({
                success: true,
                data: result.questions,
                pagination: result.pagination
            });
        } catch (error) {
            logger.error('Get questions error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get questions'
            });
        }
    };

    // Get a specific question by ID
    getQuestionById = async (req, res) => {
        try {
            const { id } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const question = await this.questionBankService.getQuestionById(id, ownerId);

            res.status(200).json({
                success: true,
                data: question
            });
        } catch (error) {
            logger.error('Get question by ID error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to get question'
            });
        }
    };

    // Create a new question
    createQuestion = async (req, res) => {
        try {
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const question = await this.questionBankService.createQuestion(
                req.body,
                ownerId,
                req.user._id
            );

            res.status(201).json({
                success: true,
                message: 'Question created successfully',
                data: question
            });
        } catch (error) {
            logger.error('Create question error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create question'
            });
        }
    };

    // Update an existing question
    updateQuestion = async (req, res) => {
        try {
            const { id } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const question = await this.questionBankService.updateQuestion(
                id,
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

    // Delete a question
    deleteQuestion = async (req, res) => {
        try {
            const { id } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const result = await this.questionBankService.deleteQuestion(id, ownerId);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            logger.error('Delete question error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to delete question'
            });
        }
    };

    // Get questions by subject
    getQuestionsBySubject = async (req, res) => {
        try {
            const { subjectId } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const options = {
                difficulty: req.query.difficulty,
                type: req.query.type,
                limit: req.query.limit || 100,
                excludeIds: req.query.excludeIds ? req.query.excludeIds.split(',') : []
            };

            const questions = await this.questionBankService.getQuestionsBySubject(
                subjectId,
                ownerId,
                options
            );

            res.status(200).json({
                success: true,
                data: questions
            });
        } catch (error) {
            logger.error('Get questions by subject error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get questions by subject'
            });
        }
    };

    // Auto-select random questions
    autoSelectQuestions = async (req, res) => {
        try {
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const { subjectId, count, difficulty, type, excludeIds } = req.body;

            if (!subjectId || !count) {
                return res.status(400).json({
                    success: false,
                    message: 'subjectId and count are required'
                });
            }

            const questions = await this.questionBankService.autoSelectQuestions({
                subjectId,
                count,
                difficulty,
                type,
                excludeIds
            }, ownerId);

            res.status(200).json({
                success: true,
                data: questions
            });
        } catch (error) {
            logger.error('Auto-select questions error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to auto-select questions'
            });
        }
    };

    // Preview auto-selection
    previewAutoSelection = async (req, res) => {
        try {
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const { selectionConfig } = req.body;

            if (!selectionConfig || !Array.isArray(selectionConfig)) {
                return res.status(400).json({
                    success: false,
                    message: 'selectionConfig array is required'
                });
            }

            const preview = await this.questionBankService.previewAutoSelection(
                selectionConfig,
                ownerId
            );

            res.status(200).json({
                success: true,
                data: preview
            });
        } catch (error) {
            logger.error('Preview auto-selection error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to preview auto-selection'
            });
        }
    };

    // Advanced search
    searchQuestions = async (req, res) => {
        try {
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const searchOptions = {
                query: req.query.q,
                subjects: req.query.subjects ? req.query.subjects.split(',') : [],
                types: req.query.types ? req.query.types.split(',') : [],
                difficulties: req.query.difficulties ? req.query.difficulties.split(',') : [],
                keywords: req.query.keywords ? req.query.keywords.split(',') : [],
                hasMedia: req.query.hasMedia !== undefined ? req.query.hasMedia === 'true' : undefined,
                limit: req.query.limit || 20,
                offset: req.query.offset || 0
            };

            const result = await this.questionBankService.searchQuestions(ownerId, searchOptions);

            res.status(200).json({
                success: true,
                data: result.questions,
                pagination: result.pagination
            });
        } catch (error) {
            logger.error('Search questions error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to search questions'
            });
        }
    };

    // Duplicate question
    duplicateQuestion = async (req, res) => {
        try {
            const { id } = req.params;
            const { subjectId } = req.body;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const duplicatedQuestion = await this.questionBankService.duplicateQuestion(
                id,
                ownerId,
                subjectId
            );

            res.status(201).json({
                success: true,
                message: 'Question duplicated successfully',
                data: duplicatedQuestion
            });
        } catch (error) {
            logger.error('Duplicate question error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to duplicate question'
            });
        }
    };

    // Get question statistics
    getQuestionStatistics = async (req, res) => {
        try {
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const statistics = await this.questionBankService.getQuestionStatistics(ownerId);

            res.status(200).json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('Get question statistics error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get question statistics'
            });
        }
    };

    // Bulk import questions (placeholder for Excel import)
    bulkImportQuestions = async (req, res) => {
        logger.info('Bulk import questions endpoint called');
        res.status(501).json({
            success: false,
            message: 'Bulk import feature will be implemented in the next phase'
        });
    };
}

const questionController = new QuestionController();

export { questionController };
