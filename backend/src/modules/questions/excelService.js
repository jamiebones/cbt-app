import * as XLSX from 'xlsx';
import { logger } from '../../config/logger.js';
import { Question, Subject } from '../../models/index.js';
import crypto from 'crypto';

class ExcelQuestionService {
    constructor() {
        // Define the expected column mapping
        this.columnMapping = {
            A: 'questionText',
            B: 'type',
            C: 'optionA',
            D: 'optionB',
            E: 'optionC',
            F: 'optionD',
            G: 'correctAnswer',
            H: 'points',
            I: 'difficulty',
            J: 'explanation'
        };

        // Define validation rules
        this.validationRules = {
            questionTypes: ['multiple_choice', 'true_false'],
            difficulties: ['easy', 'medium', 'hard'],
            multipleChoiceOptions: ['A', 'B', 'C', 'D'],
            trueFalseOptions: ['true', 'false', 'True', 'False', 'TRUE', 'FALSE']
        };
    }

    /**
     * Parse Excel file buffer and extract question data
     * @param {Buffer} fileBuffer - Excel file buffer
     * @returns {Promise<Object>} Parsed data with questions array
     */
    async parseExcelFile(fileBuffer) {
        try {
            logger.info('Starting Excel file parsing');

            // Read the workbook from buffer
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

            // Get the first worksheet
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                throw new Error('Excel file contains no worksheets');
            }

            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON with header row starting from row 1
            const rawData = XLSX.utils.sheet_to_json(worksheet, {
                header: 'A',
                range: 1, // Start from row 2 (skip header row)
                defval: '' // Default value for empty cells
            });

            if (!rawData || rawData.length === 0) {
                throw new Error('Excel file contains no data rows');
            }

            logger.info(`Parsed ${rawData.length} rows from Excel file`);

            // Transform raw data to structured format
            const questions = rawData.map((row, index) => this.transformRowToQuestion(row, index + 2));

            return {
                totalRows: questions.length,
                questions,
                metadata: {
                    sheetName,
                    parseTime: new Date().toISOString()
                }
            };

        } catch (error) {
            logger.error('Excel parsing failed:', error);
            throw new Error(`Failed to parse Excel file: ${error.message}`);
        }
    }

    /**
     * Transform a raw Excel row to a question object
     * @param {Object} row - Raw row data from Excel
     * @param {number} rowNumber - Row number for error reporting
     * @returns {Object} Transformed question object
     */
    transformRowToQuestion(row, rowNumber) {
        const question = {
            rowNumber,
            questionText: this.cleanText(row.A),
            type: this.cleanText(row.B),
            answers: [],
            correctAnswer: this.cleanText(row.G),
            points: this.parseNumber(row.H, 1),
            difficulty: this.cleanText(row.I) || 'medium',
            explanation: this.cleanText(row.J)
        };

        // Handle multiple choice options
        if (question.type === 'multiple_choice') {
            const options = [
                { id: 'A', text: this.cleanText(row.C) },
                { id: 'B', text: this.cleanText(row.D) },
                { id: 'C', text: this.cleanText(row.E) },
                { id: 'D', text: this.cleanText(row.F) }
            ];

            // Only include non-empty options
            question.answers = options.filter(option => option.text.trim() !== '');

            // Mark correct answer
            question.answers.forEach(answer => {
                answer.isCorrect = answer.id === question.correctAnswer.toUpperCase();
            });
        }

        return question;
    }

    /**
     * Validate parsed Excel data
     * @param {Array} questions - Array of parsed questions
     * @param {string} subjectCode - Subject code for all questions
     * @param {string} ownerId - Test center owner ID
     * @returns {Promise<Object>} Validation results
     */
    async validateExcelData(questions, subjectCode, ownerId) {
        logger.info(`Validating ${questions.length} questions for subject: ${subjectCode}`);

        const validationResults = {
            isValid: true,
            errors: [],
            warnings: [],
            validQuestions: [],
            invalidQuestions: []
        };

        // First, validate the subject
        const subject = await this.validateSubject(subjectCode, ownerId);
        if (!subject) {
            validationResults.isValid = false;
            validationResults.errors.push({
                type: 'SUBJECT_ERROR',
                message: `Subject with code '${subjectCode}' not found or access denied`
            });
            return validationResults;
        }

        // Validate each question
        for (const question of questions) {
            const questionValidation = this.validateSingleQuestion(question);

            if (questionValidation.isValid) {
                // Add subject reference to valid questions
                questionValidation.question.subject = subject._id;
                validationResults.validQuestions.push(questionValidation.question);
            } else {
                validationResults.invalidQuestions.push({
                    ...question,
                    errors: questionValidation.errors
                });
                validationResults.isValid = false;
            }

            // Collect all errors and warnings
            validationResults.errors.push(...questionValidation.errors);
            validationResults.warnings.push(...questionValidation.warnings);
        }

        logger.info(`Validation completed: ${validationResults.validQuestions.length} valid, ${validationResults.invalidQuestions.length} invalid`);
        return validationResults;
    }

    /**
     * Validate a single question
     * @param {Object} question - Question data to validate
     * @returns {Object} Validation result for the question
     */
    validateSingleQuestion(question) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            question: { ...question }
        };

        const { rowNumber } = question;

        // Validate required fields
        if (!question.questionText || question.questionText.trim() === '') {
            result.errors.push({
                type: 'REQUIRED_FIELD',
                row: rowNumber,
                field: 'questionText',
                message: `Row ${rowNumber}: Question text is required`
            });
            result.isValid = false;
        }

        if (!question.type || !this.validationRules.questionTypes.includes(question.type)) {
            result.errors.push({
                type: 'INVALID_TYPE',
                row: rowNumber,
                field: 'type',
                message: `Row ${rowNumber}: Question type must be one of: ${this.validationRules.questionTypes.join(', ')}`
            });
            result.isValid = false;
        }

        // Validate difficulty
        if (question.difficulty && !this.validationRules.difficulties.includes(question.difficulty)) {
            result.errors.push({
                type: 'INVALID_DIFFICULTY',
                row: rowNumber,
                field: 'difficulty',
                message: `Row ${rowNumber}: Difficulty must be one of: ${this.validationRules.difficulties.join(', ')}`
            });
            result.isValid = false;
        }

        // Validate points
        if (question.points < 1 || question.points > 100) {
            result.errors.push({
                type: 'INVALID_POINTS',
                row: rowNumber,
                field: 'points',
                message: `Row ${rowNumber}: Points must be between 1 and 100`
            });
            result.isValid = false;
        }

        // Type-specific validation
        if (question.type === 'multiple_choice') {
            this.validateMultipleChoice(question, result);
        } else if (question.type === 'true_false') {
            this.validateTrueFalse(question, result);
        }

        // Text length validation
        if (question.questionText && question.questionText.length > 2000) {
            result.warnings.push({
                type: 'TEXT_LENGTH',
                row: rowNumber,
                field: 'questionText',
                message: `Row ${rowNumber}: Question text is very long (${question.questionText.length} characters)`
            });
        }

        if (question.explanation && question.explanation.length > 1000) {
            result.warnings.push({
                type: 'TEXT_LENGTH',
                row: rowNumber,
                field: 'explanation',
                message: `Row ${rowNumber}: Explanation text is very long (${question.explanation.length} characters)`
            });
        }

        return result;
    }

    /**
     * Validate multiple choice question
     * @param {Object} question - Question data
     * @param {Object} result - Validation result object to update
     */
    validateMultipleChoice(question, result) {
        const { rowNumber } = question;

        // Must have at least 2 options
        if (!question.answers || question.answers.length < 2) {
            result.errors.push({
                type: 'INSUFFICIENT_OPTIONS',
                row: rowNumber,
                field: 'answers',
                message: `Row ${rowNumber}: Multiple choice questions must have at least 2 options`
            });
            result.isValid = false;
            return;
        }

        // Validate correct answer
        const correctAnswerOption = question.answers.find(answer => answer.id === question.correctAnswer.toUpperCase());
        if (!correctAnswerOption) {
            result.errors.push({
                type: 'INVALID_CORRECT_ANSWER',
                row: rowNumber,
                field: 'correctAnswer',
                message: `Row ${rowNumber}: Correct answer '${question.correctAnswer}' does not match any available options`
            });
            result.isValid = false;
        }

        // Check for empty options
        const emptyOptions = question.answers.filter(answer => !answer.text || answer.text.trim() === '');
        if (emptyOptions.length > 0) {
            result.errors.push({
                type: 'EMPTY_OPTION',
                row: rowNumber,
                field: 'answers',
                message: `Row ${rowNumber}: Some answer options are empty`
            });
            result.isValid = false;
        }

        // Warn about too many options
        if (question.answers.length > 4) {
            result.warnings.push({
                type: 'TOO_MANY_OPTIONS',
                row: rowNumber,
                field: 'answers',
                message: `Row ${rowNumber}: More than 4 options detected, only first 4 will be used`
            });
            question.answers = question.answers.slice(0, 4);
        }
    }

    /**
     * Validate true/false question
     * @param {Object} question - Question data
     * @param {Object} result - Validation result object to update
     */
    validateTrueFalse(question, result) {
        const { rowNumber } = question;

        // Validate correct answer for true/false
        const normalizedAnswer = question.correctAnswer.toLowerCase();
        if (!this.validationRules.trueFalseOptions.map(opt => opt.toLowerCase()).includes(normalizedAnswer)) {
            result.errors.push({
                type: 'INVALID_TRUE_FALSE_ANSWER',
                row: rowNumber,
                field: 'correctAnswer',
                message: `Row ${rowNumber}: True/False correct answer must be 'true' or 'false'`
            });
            result.isValid = false;
        } else {
            // Normalize the correct answer
            question.correctAnswer = normalizedAnswer === 'true' ? 'true' : 'false';
        }
    }

    /**
     * Validate subject exists and belongs to owner
     * @param {string} subjectCode - Subject code to validate
     * @param {string} ownerId - Test center owner ID
     * @returns {Promise<Object|null>} Subject object or null if invalid
     */
    async validateSubject(subjectCode, ownerId) {
        try {
            const subject = await Subject.findOne({
                code: subjectCode.toUpperCase(),
                testCenterOwner: ownerId,
                isActive: true
            });

            return subject;
        } catch (error) {
            logger.error('Subject validation failed:', error);
            return null;
        }
    }

    /**
     * Bulk import questions from validated data
     * @param {Array} validQuestions - Array of validated question data
     * @param {string} ownerId - Test center owner ID
     * @param {string} createdBy - User ID of who is importing
     * @returns {Promise<Object>} Import results
     */
    async bulkImportQuestions(validQuestions, ownerId, createdBy) {
        logger.info(`Starting bulk import of ${validQuestions.length} questions`);

        const batchId = crypto.randomUUID();
        const importResults = {
            batchId,
            totalQuestions: validQuestions.length,
            successCount: 0,
            errorCount: 0,
            results: [],
            importedQuestions: []
        };

        // Process questions in batches of 50 for better performance
        const batchSize = 50;
        for (let i = 0; i < validQuestions.length; i += batchSize) {
            const batch = validQuestions.slice(i, i + batchSize);
            await this.processBatch(batch, ownerId, createdBy, importResults);
        }

        // Update subject statistics after import
        if (importResults.successCount > 0) {
            await this.updateSubjectStats(validQuestions, ownerId);
        }

        logger.info(`Bulk import completed: ${importResults.successCount} successful, ${importResults.errorCount} failed`);
        return importResults;
    }

    /**
     * Process a batch of questions
     * @param {Array} batch - Batch of questions to process
     * @param {string} ownerId - Test center owner ID
     * @param {string} createdBy - User ID of who is importing
     * @param {Object} importResults - Results object to update
     */
    async processBatch(batch, ownerId, createdBy, importResults) {
        const promises = batch.map(async (questionData) => {
            try {
                const question = new Question({
                    questionText: questionData.questionText,
                    type: questionData.type,
                    difficulty: questionData.difficulty,
                    points: questionData.points,
                    answers: questionData.answers || [],
                    correctAnswer: questionData.correctAnswer,
                    explanation: questionData.explanation,
                    subject: questionData.subject,
                    testCenterOwner: ownerId,
                    createdBy: createdBy,
                    keywords: [], // Can be extended later
                    stats: {
                        timesUsed: 0,
                        averageScore: 0,
                        totalAttempts: 0,
                        correctAttempts: 0
                    }
                });

                const savedQuestion = await question.save();

                importResults.successCount++;
                importResults.results.push({
                    row: questionData.rowNumber,
                    status: 'success',
                    questionId: savedQuestion._id.toString(),
                    message: 'Question imported successfully'
                });
                importResults.importedQuestions.push(savedQuestion);

            } catch (error) {
                logger.error(`Failed to import question from row ${questionData.rowNumber}:`, error);

                importResults.errorCount++;
                importResults.results.push({
                    row: questionData.rowNumber,
                    status: 'error',
                    message: error.message || 'Failed to import question',
                    details: {
                        questionText: questionData.questionText?.substring(0, 50) + '...'
                    }
                });
            }
        });

        await Promise.all(promises);
    }

    /**
     * Update subject statistics after import
     * @param {Array} questions - Imported questions
     * @param {string} ownerId - Test center owner ID
     */
    async updateSubjectStats(questions, ownerId) {
        try {
            // Get unique subject IDs
            const subjectIds = [...new Set(questions.map(q => q.subject.toString()))];

            // Update stats for each subject in parallel
            const updatePromises = subjectIds.map(async (subjectId) => {
                const subject = await Subject.findById(subjectId);
                if (subject) {
                    await subject.updateStats();
                }
            });

            await Promise.all(updatePromises);
            logger.info(`Updated statistics for ${subjectIds.length} subjects`);
        } catch (error) {
            logger.error('Failed to update subject statistics:', error);
            // Don't throw error as this is not critical for import success
        }
    }

    /**
     * Generate Excel template for question import
     * @returns {Buffer} Excel file buffer
     */
    generateTemplate() {
        logger.info('Generating Excel template');

        // Create sample data as array of arrays (AOA format)
        const sampleData = [
            // Header row
            ['Question Text', 'Question Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Points', 'Difficulty', 'Explanation'],
            // Sample multiple choice question
            ['What is 2 + 2?', 'multiple_choice', '3', '4', '5', '6', 'B', '1', 'easy', 'Basic arithmetic addition'],
            // Sample true/false question
            ['The Earth is flat.', 'true_false', '', '', '', '', 'false', '2', 'easy', 'The Earth is approximately spherical']
        ];

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(sampleData);

        // Add the worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        logger.info('Excel template generated successfully');
        return buffer;
    }    /**
     * Utility function to clean text
     * @param {any} value - Value to clean
     * @returns {string} Cleaned text
     */
    cleanText(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    }

    /**
     * Utility function to parse number with default
     * @param {any} value - Value to parse
     * @param {number} defaultValue - Default if parsing fails
     * @returns {number} Parsed number
     */
    parseNumber(value, defaultValue = 0) {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }
}

// Create singleton instance
const excelQuestionService = new ExcelQuestionService();

export { excelQuestionService };
