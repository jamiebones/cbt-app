import Joi from 'joi';
import mongoose from 'mongoose';

const objectId = () => Joi.string().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
    }
    return value;
}, 'ObjectId Validation');

export const manualAddSchema = Joi.object({
    questionIds: Joi.array().items(objectId()).min(1).max(500).required()
        .messages({
            'array.min': 'At least one questionId is required',
            'array.max': 'Cannot add more than 500 questions at once'
        })
});

export const autoAddSchema = Joi.object({
    subjects: Joi.array().items(objectId()).min(1).max(20).required(),
    count: Joi.number().integer().min(1).max(500).required(),
    difficultyDistribution: Joi.object({
        easy: Joi.number().min(0).max(100).default(0),
        medium: Joi.number().min(0).max(100).default(0),
        hard: Joi.number().min(0).max(100).default(0)
    }).optional().custom((dist, helpers) => {
        const total = ['easy', 'medium', 'hard'].reduce((s, k) => s + (dist[k] || 0), 0);
        if (total !== 0 && total !== 100) {
            return helpers.error('any.invalid');
        }
        return dist;
    }, 'Difficulty distribution sum check')
});

export const excelAttachSchema = Joi.object({
    subjectCode: Joi.string().trim().min(1).max(50).required()
});
