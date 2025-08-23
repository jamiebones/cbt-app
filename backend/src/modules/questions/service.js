import { Question, Subject, User } from '../../models/index.js';
import { logger } from '../../config/logger.js';
import { excelQuestionService } from './excelService.js';
import { subscriptionService } from '../subscriptions/service.js';

class QuestionBankService {

    // Create a new question in the question bank
    async createQuestion(questionData, ownerId, createdBy) {
        logger.info(`Creating question for owner: ${ownerId}`);

        try {
            // Validate creator permissions
            const creator = await User.findById(createdBy);
            if (!creator) {
                throw new Error('Creator not found');
            }

            // Validate ownership
            let validOwnerRelation = false;
            if (creator.role === 'test_center_owner') {
                validOwnerRelation = creator._id.toString() === ownerId.toString();
            } else if (creator.role === 'test_creator') {
                validOwnerRelation = creator.testCenterOwner &&
                    creator.testCenterOwner.toString() === ownerId.toString();
            }

            if (!validOwnerRelation) {
                throw new Error('User does not have permission to create questions for this test center');
            }

            // Validate subject exists and belongs to the owner
            const subject = await Subject.findOne({
                _id: questionData.subject,
                testCenterOwner: ownerId,
                isActive: true
            });

            if (!subject) {
                throw new Error('Subject not found or does not belong to this test center');
            }

            // Create question
            const question = new Question({
                ...questionData,
                testCenterOwner: ownerId,
                createdBy: createdBy
            });

            // Save question and update subject stats in parallel since they're independent
            await Promise.all([
                question.save(),
                subject.updateStats()
            ]);

            // Populate related fields for response
            await question.populate([
                { path: 'subject', select: 'name code color' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ]);

            logger.info(`Question created successfully: ${question._id}`);
            return question;

        } catch (error) {
            logger.error('Failed to create question:', error);
            throw error;
        }
    }

    // Get questions with advanced filtering and search
    async getQuestions(ownerId, options = {}) {
        logger.info(`Getting questions for owner: ${ownerId}`);
        try {
            const {
                page = 1,
                limit = 20,
                subject,
                type,
                difficulty,
                search,
                keywords,
                createdBy,
                sort = 'createdAt'
            } = options;

            const skip = (page - 1) * limit;
            // Build count query with same filters
            const countQuery = {
                testCenterOwner: ownerId,
                isActive: true,
                ...(subject && { subject }),
                ...(type && { type }),
                ...(difficulty && { difficulty }),
                ...(createdBy && { createdBy }),
                ...(search && { $text: { $search: search } }),
                ...(keywords && { keywords: { $in: keywords.split(',') } })
            };
            // Get questions and total count in parallel since they're independent queries
            const [questions, total] = await Promise.all([
                Question.findByOwner(ownerId, {
                    subject,
                    type,
                    difficulty,
                    search,
                    keywords: keywords ? keywords.split(',') : undefined,
                    sort: { [sort]: -1 },
                    limit: parseInt(limit),
                    skip: parseInt(skip)
                }),
                Question.countDocuments(countQuery)
            ]);

            return {
                questions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            logger.error('Failed to get questions:', error);
            throw error;
        }
    }

    // Get single question by ID
    async getQuestionById(questionId, ownerId) {
        logger.info(`Getting question: ${questionId} for owner: ${ownerId}`);

        try {
            const question = await Question.findOne({
                _id: questionId,
                testCenterOwner: ownerId,
                isActive: true
            }).populate([
                { path: 'subject', select: 'name code color' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ]);

            if (!question) {
                throw new Error('Question not found');
            }

            return question;

        } catch (error) {
            logger.error('There was an error getting question:', error);
            throw error;
        }
    }

    // Update question
    async updateQuestion(questionId, updateData, ownerId) {
        logger.info(`Updating question: ${questionId}`);
        try {
            const question = await Question.findOne({
                _id: questionId,
                testCenterOwner: ownerId,
                isActive: true
            });

            if (!question) {
                throw new Error('Question not found');
            }

            // Validate subject if being updated
            if (updateData.subject) {
                const subject = await Subject.findOne({
                    _id: updateData.subject,
                    testCenterOwner: ownerId,
                    isActive: true
                });

                if (!subject) {
                    throw new Error('Subject not found or does not belong to this test center');
                }
            }

            // Update question
            Object.assign(question, updateData);
            await question.save();

            // Update subject statistics and populate 
            const [,] = await Promise.all([
                (async () => {
                    const subject = await Subject.findById(question.subject);
                    return subject ? subject.updateStats() : Promise.resolve();
                })(),
                question.populate([
                    { path: 'subject', select: 'name code color' },
                    { path: 'createdBy', select: 'firstName lastName email' }
                ])
            ]);

            logger.info(`Question updated successfully: ${questionId}`);
            return question;

        } catch (error) {
            logger.error('Failed to update question:', error);
            throw error;
        }
    }

    // Delete question (soft delete)
    async deleteQuestion(questionId, ownerId) {
        logger.info(`Deleting question: ${questionId}`);

        try {
            const question = await Question.findOne({
                _id: questionId,
                testCenterOwner: ownerId,
                isActive: true
            });

            if (!question) {
                throw new Error('Question not found');
            }

            // Check if question is used in any active tests
            const { Test } = await import('../../models/index.js');
            const testsUsingQuestion = await Test.countDocuments({
                questions: questionId,
                status: { $in: ['published', 'active'] }
            });

            if (testsUsingQuestion > 0) {
                throw new Error('Cannot delete question: it is used in active tests');
            }

            // Soft delete the question
            question.isActive = false;
            await question.save();

            // Update subject statistics
            const subject = await Subject.findById(question.subject);
            if (subject) {
                await subject.updateStats();
            }

            logger.info(`Question deleted successfully: ${questionId}`);
            return { success: true, message: 'Question deleted successfully' };

        } catch (error) {
            logger.error('Failed to delete question:', error);
            throw error;
        }
    }

    // Get questions by subject for auto-selection
    async getQuestionsBySubject(subjectId, ownerId, options = {}) {
        logger.info(`Getting questions for subject: ${subjectId}`);
        try {
            const {
                difficulty,
                type,
                limit = 100,
                excludeIds = []
            } = options;

            const questions = await Question.findBySubject(subjectId, ownerId, {
                difficulty,
                type,
                limit: parseInt(limit)
            });

            // Filter out excluded questions
            const filteredQuestions = questions.filter(q =>
                !excludeIds.includes(q._id.toString())
            );

            return filteredQuestions;

        } catch (error) {
            logger.error('Failed to get questions by subject:', error);
            throw error;
        }
    }

    // Auto-select random questions based on criteria
    async autoSelectQuestions(criteria, ownerId) {
        logger.info(`Auto-selecting questions for owner: ${ownerId}`);

        try {
            const {
                subjectId,
                count,
                difficulty,
                type,
                excludeIds = []
            } = criteria;

            // Validate subject and get random questions 
            const [subject, questions] = await Promise.all([
                Subject.findOne({
                    _id: subjectId,
                    testCenterOwner: ownerId,
                    isActive: true
                }),
                Question.getRandomQuestions({
                    subjectId,
                    ownerId,
                    count: parseInt(count),
                    difficulty,
                    type,
                    excludeIds
                })
            ]);

            if (!subject) {
                throw new Error('Subject not found');
            }

            // Populate subject info
            const populatedQuestions = await Question.populate(questions, [
                { path: 'subject', select: 'name code color' },
                { path: 'createdBy', select: 'firstName lastName' }
            ]);

            return populatedQuestions;

        } catch (error) {
            logger.error('Failed to auto-select questions:', error);
            throw error;
        }
    }

    // Preview auto-selection (without committing to a test)
    async previewAutoSelection(selectionConfig, ownerId) {
        logger.info(`Previewing auto-selection for owner: ${ownerId}`);

        try {
            const preview = [];
            let totalQuestions = 0;

            for (const config of selectionConfig) {
                const { subjectId, count, difficulty, type } = config;

                // Get available count, sample questions, and subject info in parallel
                const [availableCount, sampleQuestions, subject] = await Promise.all([
                    Question.countDocuments({
                        subject: subjectId,
                        testCenterOwner: ownerId,
                        isActive: true,
                        ...(difficulty && { difficulty }),
                        ...(type && { type })
                    }),
                    this.autoSelectQuestions({
                        subjectId,
                        count: Math.min(count, 5), // Limit sample to 5 questions
                        difficulty,
                        type
                    }, ownerId),
                    Subject.findById(subjectId)
                ]);

                preview.push({
                    subject: {
                        _id: subject._id,
                        name: subject.name,
                        code: subject.code,
                        color: subject.color
                    },
                    requestedCount: count,
                    availableCount,
                    canFulfill: availableCount >= count,
                    sampleQuestions: sampleQuestions.slice(0, 3), // Show only 3 for preview
                    difficulty,
                    type
                });

                totalQuestions += Math.min(count, availableCount);
            }

            return {
                preview,
                summary: {
                    totalRequestedQuestions: selectionConfig.reduce((sum, config) => sum + config.count, 0),
                    totalAvailableQuestions: totalQuestions,
                    canFulfillRequest: preview.every(p => p.canFulfill)
                }
            };

        } catch (error) {
            logger.error('Failed to preview auto-selection:', error);
            throw error;
        }
    }

    // Search questions with advanced filters
    async searchQuestions(ownerId, searchOptions = {}) {
        logger.info(`Searching questions for owner: ${ownerId}`);

        try {
            const {
                query,
                subjects = [],
                types = [],
                difficulties = [],
                keywords = [],
                hasMedia,
                limit = 20,
                offset = 0
            } = searchOptions;

            const searchQuery = {
                testCenterOwner: ownerId,
                isActive: true
            };

            // Text search
            if (query) {
                searchQuery.$text = { $search: query };
            }

            // Filter by subjects
            if (subjects.length > 0) {
                searchQuery.subject = { $in: subjects };
            }

            // Filter by types
            if (types.length > 0) {
                searchQuery.type = { $in: types };
            }

            // Filter by difficulties
            if (difficulties.length > 0) {
                searchQuery.difficulty = { $in: difficulties };
            }

            // Filter by keywords
            if (keywords.length > 0) {
                searchQuery.keywords = { $in: keywords };
            }

            // Filter by media presence
            if (hasMedia !== undefined) {
                if (hasMedia) {
                    searchQuery.$or = [
                        { 'media.image': { $exists: true, $ne: null } },
                        { 'media.audio': { $exists: true, $ne: null } },
                        { 'media.video': { $exists: true, $ne: null } }
                    ];
                } else {
                    searchQuery['media.image'] = { $exists: false };
                    searchQuery['media.audio'] = { $exists: false };
                    searchQuery['media.video'] = { $exists: false };
                }
            }

            // Get questions and total count in parallel since they're independent
            const [questions, total] = await Promise.all([
                Question.find(searchQuery)
                    .populate([
                        { path: 'subject', select: 'name code color' },
                        { path: 'createdBy', select: 'firstName lastName' }
                    ])
                    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
                    .limit(parseInt(limit))
                    .skip(parseInt(offset)),
                Question.countDocuments(searchQuery)
            ]);

            return {
                questions,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total,
                    hasMore: offset + limit < total
                }
            };

        } catch (error) {
            logger.error('Failed to search questions:', error);
            throw error;
        }
    }

    // Duplicate question
    async duplicateQuestion(questionId, ownerId, newSubjectId = null) {
        logger.info(`Duplicating question: ${questionId}`);

        try {
            const originalQuestion = await Question.findOne({
                _id: questionId,
                testCenterOwner: ownerId,
                isActive: true
            });

            if (!originalQuestion) {
                throw new Error('Question not found');
            }

            // Create duplicate
            const duplicateQuestion = originalQuestion.duplicate();

            // Update subject if specified
            if (newSubjectId) {
                const subject = await Subject.findOne({
                    _id: newSubjectId,
                    testCenterOwner: ownerId,
                    isActive: true
                });

                if (!subject) {
                    throw new Error('Target subject not found or access denied');
                }

                duplicateQuestion.subject = newSubjectId;
            }

            // Add "Copy" to the question text
            duplicateQuestion.questionText = `${duplicateQuestion.questionText} (Copy)`;

            // Save duplicate and update subject stats in parallel
            await Promise.all([
                duplicateQuestion.save(),
                (async () => {
                    const subject = await Subject.findById(duplicateQuestion.subject);
                    return subject ? subject.updateStats() : Promise.resolve();
                })()
            ]);

            // Populate for response
            await duplicateQuestion.populate([
                { path: 'subject', select: 'name code color' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ]);

            logger.info(`Question duplicated successfully: ${duplicateQuestion._id}`);
            return duplicateQuestion;

        } catch (error) {
            logger.error('Failed to duplicate question:', error);
            throw error;
        }
    }

    // Get question statistics
    async getQuestionStatistics(ownerId) {
        logger.info(`Getting question statistics for owner: ${ownerId}`);
        try {
            const stats = await Question.getQuestionStats(ownerId);
            const summary = {
                totalQuestions: 0,
                byType: {},
                byDifficulty: {},
                bySubject: {},
                averageUsage: 0,
                averageScore: 0
            };

            let totalUsage = 0;
            let totalScore = 0;
            let questionsWithStats = 0;

            stats.forEach(stat => {
                summary.totalQuestions += stat.count;

                // Group by type
                if (!summary.byType[stat._id.type]) {
                    summary.byType[stat._id.type] = 0;
                }
                summary.byType[stat._id.type] += stat.count;

                // Group by difficulty
                if (!summary.byDifficulty[stat._id.difficulty]) {
                    summary.byDifficulty[stat._id.difficulty] = 0;
                }
                summary.byDifficulty[stat._id.difficulty] += stat.count;

                // Group by subject
                if (stat.subjectInfo && stat.subjectInfo.length > 0) {
                    const subjectName = stat.subjectInfo[0].name;
                    if (!summary.bySubject[subjectName]) {
                        summary.bySubject[subjectName] = 0;
                    }
                    summary.bySubject[subjectName] += stat.count;
                }

                // Calculate averages
                if (stat.totalUsage > 0) {
                    totalUsage += stat.totalUsage;
                    questionsWithStats += stat.count;
                }

                if (stat.avgScore > 0) {
                    totalScore += stat.avgScore * stat.count;
                }
            });

            summary.averageUsage = questionsWithStats > 0 ? totalUsage / questionsWithStats : 0;
            summary.averageScore = summary.totalQuestions > 0 ? totalScore / summary.totalQuestions : 0;

            return summary;

        } catch (error) {
            logger.error('Failed to get question statistics:', error);
            throw error;
        }
    }

    // ============ EXCEL IMPORT FUNCTIONALITY ============

    /**
     * Import questions from Excel file
     * @param {Buffer} fileBuffer - Excel file buffer
     * @param {string} subjectCode - Subject code for all questions
     * @param {string} ownerId - Test center owner ID
     * @param {string} createdBy - User ID who is importing
     * @param {Object} options - Import options
     * @returns {Promise<Object>} Import results
     */
    async importQuestionsFromExcel(fileBuffer, subjectCode, ownerId, createdBy, options = {}) {
        logger.info(`Starting Excel import for subject: ${subjectCode}, owner: ${ownerId}`);

        try {
            // Check subscription limits for Excel import
            const validation = await subscriptionService.validateAction(ownerId, 'importExcel');
            if (!validation.allowed) {
                throw new Error(validation.message);
            }

            // Parse Excel file
            const parseResult = await excelQuestionService.parseExcelFile(fileBuffer);
            logger.info(`Parsed ${parseResult.totalRows} rows from Excel file`);

            // Validate parsed data
            const validationResult = await excelQuestionService.validateExcelData(
                parseResult.questions,
                subjectCode,
                ownerId
            );

            if (!validationResult.isValid && validationResult.validQuestions.length === 0) {
                return {
                    success: false,
                    message: 'No valid questions found in Excel file',
                    errors: validationResult.errors,
                    totalRows: parseResult.totalRows,
                    validCount: 0,
                    invalidCount: parseResult.totalRows
                };
            }

            // Check subscription limits for question count
            const questionCountValidation = await subscriptionService.validateAction(
                ownerId,
                'createQuestion',
                { count: validationResult.validQuestions.length }
            );

            if (!questionCountValidation.allowed) {
                throw new Error(questionCountValidation.message);
            }

            // Perform bulk import for valid questions
            const importResult = await excelQuestionService.bulkImportQuestions(
                validationResult.validQuestions,
                ownerId,
                createdBy
            );

            return {
                success: true,
                message: `Successfully imported ${importResult.successCount} out of ${parseResult.totalRows} questions`,
                batchId: importResult.batchId,
                summary: {
                    totalRows: parseResult.totalRows,
                    validCount: validationResult.validQuestions.length,
                    invalidCount: validationResult.invalidQuestions.length,
                    successCount: importResult.successCount,
                    errorCount: importResult.errorCount
                },
                results: importResult.results,
                validationErrors: validationResult.errors,
                validationWarnings: validationResult.warnings,
                importedQuestions: importResult.importedQuestions.map(q => ({
                    id: q._id,
                    questionText: q.questionText.substring(0, 100) + '...',
                    type: q.type,
                    difficulty: q.difficulty,
                    points: q.points
                }))
            };

        } catch (error) {
            logger.error('Excel import failed:', error);
            throw error;
        }
    }

    /**
     * Preview Excel import without actually importing
     * @param {Buffer} fileBuffer - Excel file buffer  
     * @param {string} subjectCode - Subject code for all questions
     * @param {string} ownerId - Test center owner ID
     * @param {Object} options - Preview options
     * @returns {Promise<Object>} Preview results
     */
    async previewExcelImport(fileBuffer, subjectCode, ownerId, options = {}) {
        logger.info(`Previewing Excel import for subject: ${subjectCode}, owner: ${ownerId}`);

        try {
            const { maxRows = 100 } = options;

            // Parse Excel file
            const parseResult = await excelQuestionService.parseExcelFile(fileBuffer);

            // Limit preview to maxRows
            const questionsToPreview = parseResult.questions.slice(0, maxRows);

            // Validate parsed data
            const validationResult = await excelQuestionService.validateExcelData(
                questionsToPreview,
                subjectCode,
                ownerId
            );

            // Check subscription limits
            const subscriptionValidation = await subscriptionService.validateAction(
                ownerId,
                'createQuestion',
                { count: validationResult.validQuestions.length }
            );

            return {
                success: true,
                preview: {
                    totalRowsInFile: parseResult.totalRows,
                    previewRows: questionsToPreview.length,
                    validCount: validationResult.validQuestions.length,
                    invalidCount: validationResult.invalidQuestions.length,
                    subscriptionAllowed: subscriptionValidation.allowed,
                    subscriptionMessage: subscriptionValidation.message
                },
                sampleQuestions: validationResult.validQuestions.slice(0, 5).map(q => ({
                    row: q.rowNumber,
                    questionText: q.questionText.substring(0, 100) + '...',
                    type: q.type,
                    difficulty: q.difficulty,
                    points: q.points,
                    hasAnswers: q.answers && q.answers.length > 0
                })),
                errors: validationResult.errors.slice(0, 20), // Limit errors shown
                warnings: validationResult.warnings.slice(0, 10), // Limit warnings shown
                metadata: parseResult.metadata
            };

        } catch (error) {
            logger.error('Excel preview failed:', error);
            throw error;
        }
    }

    /**
     * Generate Excel template for question import
     * @param {string} ownerId - Test center owner ID (for future customization)
     * @returns {Buffer} Excel template file buffer
     */
    async generateExcelTemplate(ownerId) {
        logger.info(`Generating Excel template for owner: ${ownerId}`);

        try {
            // Check if user can import Excel files
            const validation = await subscriptionService.validateAction(ownerId, 'importExcel');
            if (!validation.allowed) {
                throw new Error(validation.message);
            }

            const templateBuffer = excelQuestionService.generateTemplate();

            logger.info('Excel template generated successfully');
            return templateBuffer;

        } catch (error) {
            logger.error('Failed to generate Excel template:', error);
            throw error;
        }
    }

    /**
     * Get import batch status (for tracking long-running imports)
     * @param {string} batchId - Batch ID from import
     * @param {string} ownerId - Test center owner ID
     * @returns {Promise<Object>} Batch status
     */
    async getImportBatchStatus(batchId, ownerId) {
        logger.info(`Getting import batch status: ${batchId} for owner: ${ownerId}`);

        try {
            // For now, we'll query recently imported questions
            // In a more advanced implementation, this could be stored in Redis
            const recentQuestions = await Question.find({
                testCenterOwner: ownerId,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
            })
                .populate('subject', 'name code')
                .sort({ createdAt: -1 })
                .limit(100);

            // Simple status response
            return {
                batchId,
                status: 'completed', // In future: 'pending', 'processing', 'completed', 'failed'
                questionsCount: recentQuestions.length,
                recentQuestions: recentQuestions.slice(0, 10).map(q => ({
                    id: q._id,
                    questionText: q.questionText.substring(0, 100) + '...',
                    type: q.type,
                    subject: q.subject,
                    createdAt: q.createdAt
                }))
            };

        } catch (error) {
            logger.error('Failed to get import batch status:', error);
            throw error;
        }
    }
}

// Create singleton instance
const questionBankService = new QuestionBankService();

export { questionBankService };
