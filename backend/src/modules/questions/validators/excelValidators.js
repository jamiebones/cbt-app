import Joi from 'joi';
import { Question } from '../../../models/index.js';

// Validation schema for Excel import request
export const excelImportSchema = Joi.object({
    subjectCode: Joi.string()
        .required()
        .trim()
        .min(1)
        .max(50) 
        .messages({
            'string.empty': 'Subject code is required',
            'string.max': 'Subject code cannot exceed 50 characters'
        })
});

// Validation schema for import preview request
export const previewImportSchema = Joi.object({
    subjectCode: Joi.string()
        .required()
        .trim()
        .min(1)
        .max(50)
        .messages({
            'string.empty': 'Subject code is required'
        }),
    maxRows: Joi.number()
        .optional()
        .min(1)
        .max(1000)
        .default(100)
        .messages({
            'number.min': 'Max rows must be at least 1',
            'number.max': 'Max rows cannot exceed 1000'
        })
});

// Validation schema for individual question data from Excel
export const questionDataSchema = Joi.object({
    questionText: Joi.string()
        .required()
        .min(1)
        .max(2000)
        .messages({
            'string.empty': 'Question text is required',
            'string.max': 'Question text cannot exceed 2000 characters'
        }),

    type: Joi.string()
        .required()
        .valid('multiple_choice', 'true_false')
        .messages({
            'any.only': 'Question type must be either multiple_choice or true_false'
        }),

    optionA: Joi.when('type', {
        is: 'multiple_choice',
        then: Joi.string().required().min(1).max(500).messages({
            'string.empty': 'Option A is required for multiple choice questions',
            'string.max': 'Option A cannot exceed 500 characters'
        }),
        otherwise: Joi.string().optional().allow('')
    }),

    optionB: Joi.when('type', {
        is: 'multiple_choice',
        then: Joi.string().required().min(1).max(500).messages({
            'string.empty': 'Option B is required for multiple choice questions',
            'string.max': 'Option B cannot exceed 500 characters'
        }),
        otherwise: Joi.string().optional().allow('')
    }),

    optionC: Joi.string()
        .optional()
        .allow('')
        .max(500)
        .messages({
            'string.max': 'Option C cannot exceed 500 characters'
        }),

    optionD: Joi.string()
        .optional()
        .allow('')
        .max(500)
        .messages({
            'string.max': 'Option D cannot exceed 500 characters'
        }),

    correctAnswer: Joi.alternatives().try(
        // For multiple choice: A, B, C, or D
        Joi.when('type', {
            is: 'multiple_choice',
            then: Joi.string().valid('A', 'B', 'C', 'D', 'a', 'b', 'c', 'd').messages({
                'any.only': 'Correct answer for multiple choice must be A, B, C, or D'
            })
        }),
        // For true/false: true or false
        Joi.when('type', {
            is: 'true_false',
            then: Joi.string().valid('true', 'false', 'True', 'False', 'TRUE', 'FALSE').messages({
                'any.only': 'Correct answer for true/false must be true or false'
            })
        })
    ).required().messages({
        'any.required': 'Correct answer is required'
    }),

    points: Joi.number()
        .optional()
        .min(1)
        .max(100)
        .default(1)
        .messages({
            'number.min': 'Points must be at least 1',
            'number.max': 'Points cannot exceed 100'
        }),

    difficulty: Joi.string()
        .optional()
        .valid('easy', 'medium', 'hard')
        .default('medium')
        .messages({
            'any.only': 'Difficulty must be easy, medium, or hard'
        }),

    explanation: Joi.string()
        .optional()
        .allow('')
        .max(1000)
        .messages({
            'string.max': 'Explanation cannot exceed 1000 characters'
        }),

    rowNumber: Joi.number()
        .optional()
        .min(1)
});

// Validation schema for bulk import options
export const bulkImportOptionsSchema = Joi.object({
    subjectCode: Joi.string()
        .required()
        .trim()
        .min(1)
        .max(50),

    batchSize: Joi.number()
        .optional()
        .min(10)
        .max(100)
        .default(50),

    continueOnError: Joi.boolean()
        .optional()
        .default(false),

    validateOnly: Joi.boolean()
        .optional()
        .default(false)
});

// File validation schema
export const fileValidationSchema = Joi.object({
    mimetype: Joi.string()
        .required()
        .valid(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'application/octet-stream' // Sometimes Excel files are detected as this
        )
        .messages({
            'any.only': 'File must be an Excel file (.xlsx or .xls)'
        }),

    size: Joi.number()
        .required()
        .max(10 * 1024 * 1024) // 10MB max
        .messages({
            'number.max': 'File size cannot exceed 10MB'
        }),

    originalname: Joi.string()
        .required()
        .pattern(/\.(xlsx|xls)$/i)
        .messages({
            'string.pattern.base': 'File must have .xlsx or .xls extension'
        })
});

// Schema for validating import results
export const importResultSchema = Joi.object({
    batchId: Joi.string().required(),
    totalQuestions: Joi.number().min(0).required(),
    successCount: Joi.number().min(0).required(),
    errorCount: Joi.number().min(0).required(),
    results: Joi.array().items(
        Joi.object({
            row: Joi.number().required(),
            status: Joi.string().valid('success', 'error', 'warning').required(),
            questionId: Joi.string().optional(),
            message: Joi.string().required(),
            details: Joi.object().optional()
        })
    ).required()
});

// Custom validation functions
export const validateMultipleChoiceAnswers = (question) => {
    if (question.type !== 'multiple_choice') return true;

    const options = [question.optionA, question.optionB, question.optionC, question.optionD]
        .filter(option => option && option.trim() !== '');

    // Must have at least 2 options
    if (options.length < 2) {
        return false;
    }

    // Correct answer must correspond to an available option
    const correctAnswerIndex = question.correctAnswer.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
    if (correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
        return false;
    }

    return true;
};

export const validateQuestionUniqueness = async (questions, ownerId, subjectId) => {
    // Check for duplicate questions within the import batch
    const duplicatesInBatch = [];
    const questionTexts = new Set();

    questions.forEach((question, index) => {
        const normalizedText = question.questionText.toLowerCase().trim();
        if (questionTexts.has(normalizedText)) {
            duplicatesInBatch.push({
                row: question.rowNumber || index + 1,
                message: 'Duplicate question found within the import file'
            });
        }
        questionTexts.add(normalizedText);
    });

    // Check against existing questions in the database
    if (questions.length > 0) {
        const existingQuestions = await Question.find({
            testCenterOwner: ownerId,
            subject: subjectId,
            isActive: true,
            questionText: {
                $in: questions.map(q => new RegExp(q.questionText.trim(), 'i'))
            }
        }).select('questionText');

        const existingTexts = new Set(
            existingQuestions.map(q => q.questionText.toLowerCase().trim())
        );

        questions.forEach((question, index) => {
            const normalizedText = question.questionText.toLowerCase().trim();
            if (existingTexts.has(normalizedText)) {
                duplicatesInBatch.push({
                    row: question.rowNumber || index + 1,
                    message: 'Question already exists in the database'
                });
            }
        });
    }

    return duplicatesInBatch;
};
