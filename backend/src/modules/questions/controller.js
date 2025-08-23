import { questionBankService } from './service.js';
import { logger } from '../../config/logger.js';
import {
    excelImportSchema,
    previewImportSchema,
    fileValidationSchema
} from './validators/excelValidators.js';
import multer from 'multer';

class QuestionController {
    constructor() {
        this.questionBankService = questionBankService;

        // Configure multer for Excel file uploads
        this.upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB max file size
                files: 1 // Only one file at a time
            },
            fileFilter: (req, file, cb) => {
                // Validate file type
                const allowedMimes = [
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                    'application/vnd.ms-excel', // .xls
                    'application/octet-stream' // Sometimes Excel files are detected as this
                ];

                const allowedExtensions = /\.(xlsx|xls)$/i;

                if (allowedMimes.includes(file.mimetype) || allowedExtensions.test(file.originalname)) {
                    cb(null, true);
                } else {
                    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
                }
            }
        });
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

    // Bulk import questions method
    bulkImportQuestions = async (req, res) => {
        logger.info('Excel import endpoint called');

        try {
            // Validate file presence
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No Excel file provided'
                });
            }

            // Validate file
            const { error: fileError } = fileValidationSchema.validate({
                mimetype: req.file.mimetype,
                size: req.file.size,
                originalname: req.file.originalname
            });

            if (fileError) {
                return res.status(400).json({
                    success: false,
                    message: fileError.details[0].message
                });
            }

            // Validate request body
            const { error: bodyError, value } = excelImportSchema.validate(req.body);
            if (bodyError) {
                return res.status(400).json({
                    success: false,
                    message: bodyError.details[0].message
                });
            }

            const { subjectCode } = value;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            // Perform import
            const result = await this.questionBankService.importQuestionsFromExcel(
                req.file.buffer,
                subjectCode,
                ownerId,
                req.user._id
            );

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: result.message,
                    data: result
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message,
                    data: result
                });
            }

        } catch (error) {
            logger.error('Excel import error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to import questions from Excel'
            });
        }
    };

    // Preview Excel import method
    previewExcelImport = async (req, res) => {
        logger.info('Excel import preview endpoint called');

        try {
            // Validate file presence
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No Excel file provided'
                });
            }

            // Validate file
            const { error: fileError } = fileValidationSchema.validate({
                mimetype: req.file.mimetype,
                size: req.file.size,
                originalname: req.file.originalname
            });

            if (fileError) {
                return res.status(400).json({
                    success: false,
                    message: fileError.details[0].message
                });
            }

            // Validate request body
            const { error: bodyError, value } = previewImportSchema.validate(req.body);
            if (bodyError) {
                return res.status(400).json({
                    success: false,
                    message: bodyError.details[0].message
                });
            }

            const { subjectCode, maxRows } = value;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            // Generate preview
            const preview = await this.questionBankService.previewExcelImport(
                req.file.buffer,
                subjectCode,
                ownerId,
                { maxRows }
            );

            res.status(200).json({
                success: true,
                data: preview
            });

        } catch (error) {
            logger.error('Excel preview error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to preview Excel import'
            });
        }
    };

    // Download Excel template
    downloadExcelTemplate = async (req, res) => {
        logger.info('Excel template download endpoint called');

        try {
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const templateBuffer = await this.questionBankService.generateExcelTemplate(ownerId);

            // Set response headers for file download
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="question_import_template.xlsx"');
            res.setHeader('Content-Length', templateBuffer.length);

            res.send(templateBuffer);

        } catch (error) {
            logger.error('Excel template download error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to generate Excel template'
            });
        }
    };

    // Get import batch status
    getImportBatchStatus = async (req, res) => {
        try {
            const { batchId } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const status = await this.questionBankService.getImportBatchStatus(batchId, ownerId);

            res.status(200).json({
                success: true,
                data: status
            });

        } catch (error) {
            logger.error('Get import batch status error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get import batch status'
            });
        }
    };
}

const questionController = new QuestionController();

export { questionController };
