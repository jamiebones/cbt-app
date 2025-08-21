import mongoose from 'mongoose';

const { Schema } = mongoose;

// Answer option schema for multiple choice questions
const answerOptionSchema = new Schema({
    id: {
        type: String,
        required: true // A, B, C, D, etc.
    },
    text: {
        type: String,
        required: [true, 'Answer option text is required'],
        trim: true,
        maxlength: [500, 'Answer option cannot exceed 500 characters']
    },
    image: {
        type: String, // URL/path to image file
        trim: true
    },
    isCorrect: {
        type: Boolean,
        default: false
    }
}, { _id: false });

// Question schema with comprehensive validation and multimedia support
const questionSchema = new Schema({
    // Basic Information
    questionText: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true,
        maxlength: [2000, 'Question text cannot exceed 2000 characters']
    },

    explanation: {
        type: String,
        trim: true,
        maxlength: [1000, 'Explanation cannot exceed 1000 characters']
    },

    // Question Type
    type: {
        type: String,
        enum: {
            values: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'],
            message: 'Invalid question type'
        },
        required: [true, 'Question type is required']
    },

    // Difficulty Level
    difficulty: {
        type: String,
        enum: {
            values: ['easy', 'medium', 'hard'],
            message: 'Difficulty must be easy, medium, or hard'
        },
        default: 'medium'
    },

    // Points and Scoring
    points: {
        type: Number,
        required: [true, 'Question points are required'],
        min: [1, 'Question must be worth at least 1 point'],
        max: [100, 'Question cannot be worth more than 100 points'],
        default: 1
    },

    timeLimit: {
        type: Number, // in seconds, null means no time limit
        min: null,
        max: null
    },

    // Answer Configuration
    answers: [answerOptionSchema], // For multiple choice questions

    correctAnswer: {
        type: String, // For true/false, short answer, fill blank
        trim: true,
        maxlength: [1000, 'Correct answer cannot exceed 1000 characters']
    },

    // acceptableAnswers: [{
    //     type: String, // Alternative correct answers for short answer questions
    //     trim: true,
    //     maxlength: [1000, 'Answer cannot exceed 1000 characters']
    // }],

    // Multimedia Content
    media: {
        image: {
            type: String, // URL/path to image file
            trim: true
        },
        audio: {
            type: String, // URL/path to audio file
            trim: true
        },
        video: {
            type: String, // URL/path to video file (future feature)
            trim: true
        }
    },

    // Categorization
    subject: {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
        required: [true, 'Question subject is required'],
        index: true
    },

    // topic: {
    //     type: String,
    //     trim: true,
    //     maxlength: [100, 'Topic cannot exceed 100 characters']
    // },

    keywords: [{
        type: String,
        trim: true,
        maxlength: [50, 'Keyword cannot exceed 50 characters']
    }],

    // Ownership and Access
    testCenterOwner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Test center owner is required'],
        index: true
    },

    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Question creator is required']
    },

    // Question Bank Management
    isPublic: {
        type: Boolean,
        default: false // If true, other test centers can use this question
    },

    isActive: {
        type: Boolean,
        default: true
    },

    // Usage Statistics
    stats: {
        timesUsed: {
            type: Number,
            default: 0
        },
        averageScore: {
            type: Number,
            default: 0
        },
        totalAttempts: {
            type: Number,
            default: 0
        },
        correctAttempts: {
            type: Number,
            default: 0
        }
    },

    // Version Control
    version: {
        type: Number,
        default: 1
    },

    lastModified: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            delete ret.__v;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// Indexes for performance
questionSchema.index({ testCenterOwner: 1, subject: 1 });
questionSchema.index({ createdBy: 1 });
questionSchema.index({ type: 1, difficulty: 1 });
questionSchema.index({ isActive: 1, isPublic: 1 });
questionSchema.index({ keywords: 1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ questionText: 'text', explanation: 'text' }); // Text search

// Virtual for correct answer percentage
questionSchema.virtual('correctPercentage').get(function () {
    if (this.stats.totalAttempts === 0) return 0;
    return Math.round((this.stats.correctAttempts / this.stats.totalAttempts) * 100);
});

// Virtual for difficulty score (based on correct percentage)
questionSchema.virtual('difficultyScore').get(function () {
    const percentage = this.correctPercentage;
    if (percentage >= 80) return 'easy';
    if (percentage >= 50) return 'medium';
    return 'hard';
});

// Virtual for media check
questionSchema.virtual('hasMedia').get(function () {
    return !!(this.media.image || this.media.audio || this.media.video);
});

// Pre-save middleware
questionSchema.pre('save', function (next) {
    // Update lastModified timestamp
    this.lastModified = new Date();

    // Validate answers based on question type
    if (this.type === 'multiple_choice') {
        if (!this.answers || this.answers.length < 2) {
            next(new Error('Multiple choice questions must have at least 2 answer options'));
            return;
        }

        const correctAnswers = this.answers.filter(answer => answer.isCorrect);
        if (correctAnswers.length !== 1) {
            next(new Error('Multiple choice questions must have exactly one correct answer'));
            return;
        }
    }

    if (this.type === 'true_false') {
        if (!this.correctAnswer || !['true', 'false'].includes(this.correctAnswer.toLowerCase())) {
            next(new Error('True/false questions must have correct answer as "true" or "false"'));
            return;
        }
    }
    //this will be implemented when we use an LLM for answers
    // if (['short_answer', 'fill_blank'].includes(this.type)) {
    //     if (!this.correctAnswer && (!this.acceptableAnswers || this.acceptableAnswers.length === 0)) {
    //         next(new Error('Short answer and fill blank questions must have at least one correct answer'));
    //         return;
    //     }
    // }

    next();
});

// Instance methods
questionSchema.methods.checkAnswer = function (studentAnswer) {
    if (!studentAnswer) {
        return { isCorrect: false, score: 0 };
    }

    let isCorrect = false;
    const normalizedStudentAnswer = studentAnswer.toString().trim().toLowerCase();

    switch (this.type) {
        case 'multiple_choice':
            const correctOption = this.answers.find(answer => answer.isCorrect);
            isCorrect = correctOption && correctOption.id === studentAnswer;
            break;

        case 'true_false':
            isCorrect = this.correctAnswer.toLowerCase() === normalizedStudentAnswer;
            break;
        // case 'short_answer':
        // case 'fill_blank':
        //     // Check against main correct answer
        //     if (this.correctAnswer && 
        //         this.correctAnswer.trim().toLowerCase() === normalizedStudentAnswer) {
        //         isCorrect = true;
        //     }

        //     // Check against acceptable alternatives
        //     if (!isCorrect && this.acceptableAnswers && this.acceptableAnswers.length > 0) {
        //         isCorrect = this.acceptableAnswers.some(answer => 
        //             answer.trim().toLowerCase() === normalizedStudentAnswer
        //         );
        //     }
        //     break;

        // case 'essay':
        //     // Essay questions require manual grading
        //     return { isCorrect: null, score: null, requiresManualGrading: true };
    }

    const score = isCorrect ? this.points : 0;
    return { isCorrect, score, maxPoints: this.points };
};

questionSchema.methods.updateStats = function (isCorrect) {
    this.stats.totalAttempts += 1;
    if (isCorrect) {
        this.stats.correctAttempts += 1;
    }

    // Recalculate average score
    this.stats.averageScore = this.stats.totalAttempts > 0
        ? (this.stats.correctAttempts / this.stats.totalAttempts) * 100
        : 0;

    return this.save();
};

questionSchema.methods.incrementUsage = function () {
    this.stats.timesUsed += 1;
    return this.save();
};

// Duplicate question method
questionSchema.methods.duplicate = function (newOwnerId = null) {
    const duplicatedQuestion = new this.constructor({
        questionText: this.questionText,
        explanation: this.explanation,
        type: this.type,
        difficulty: this.difficulty,
        points: this.points,
        answers: this.answers.map(answer => ({
            id: answer.id,
            text: answer.text,
            image: answer.image,
            isCorrect: answer.isCorrect
        })),
        correctAnswer: this.correctAnswer,
        acceptableAnswers: this.acceptableAnswers ? [...this.acceptableAnswers] : undefined,
        subject: this.subject,
        keywords: this.keywords ? [...this.keywords] : [],
        topic: this.topic,
        media: {
            image: this.media?.image,
            audio: this.media?.audio,
            video: this.media?.video
        },
        testCenterOwner: newOwnerId || this.testCenterOwner,
        createdBy: this.createdBy,
        isPublic: false,
        isActive: true,
        stats: {
            timesUsed: 0,
            averageScore: 0,
            totalAttempts: 0,
            correctAttempts: 0
        },
        version: 1
    });

    return duplicatedQuestion;
};


// Static methods
questionSchema.statics.findByOwner = function (ownerId, options = {}) {
    const query = { testCenterOwner: ownerId, isActive: true };

    if (options.subject) {
        query.subject = options.subject;
    }

    if (options.type) {
        query.type = options.type;
    }

    if (options.difficulty) {
        query.difficulty = options.difficulty;
    }

    if (options.search) {
        query.$text = { $search: options.search };
    }

    if (options.keywords && options.keywords.length > 0) {
        query.keywords = { $in: options.keywords };
    }

    return this.find(query)
        .populate('subject', 'name')
        .populate('createdBy', 'firstName lastName')
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

questionSchema.statics.findBySubject = function (subjectId, ownerId, options = {}) {
    const query = {
        subject: subjectId,
        testCenterOwner: ownerId,
        isActive: true
    };

    if (options.difficulty) {
        query.difficulty = options.difficulty;
    }

    if (options.type) {
        query.type = options.type;
    }

    return this.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 100);
};

questionSchema.statics.getRandomQuestions = function (criteria) {
    const { subjectId, ownerId, count, difficulty, type, excludeIds = [] } = criteria;

    const matchStage = {
        $match: {
            subject: new mongoose.Types.ObjectId(subjectId),
            testCenterOwner: new mongoose.Types.ObjectId(ownerId),
            isActive: true,
            _id: { $nin: excludeIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
    };

    if (difficulty) {
        matchStage.$match.difficulty = difficulty;
    }

    if (type) {
        matchStage.$match.type = type;
    }

    return this.aggregate([
        matchStage,
        { $sample: { size: count } },
        {
            $lookup: {
                from: 'subjects',
                localField: 'subject',
                foreignField: '_id',
                as: 'subject'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'createdBy'
            }
        }
    ]);
};

questionSchema.statics.getQuestionStats = function (ownerId) {
    return this.aggregate([
        { $match: { testCenterOwner: new mongoose.Types.ObjectId(ownerId), isActive: true } },
        {
            $group: {
                _id: {
                    subject: '$subject',
                    type: '$type',
                    difficulty: '$difficulty'
                },
                count: { $sum: 1 },
                avgScore: { $avg: '$stats.averageScore' },
                totalUsage: { $sum: '$stats.timesUsed' }
            }
        },
        {
            $lookup: {
                from: 'subjects',
                localField: '_id.subject',
                foreignField: '_id',
                as: 'subjectInfo'
            }
        }
    ]);
};

questionSchema.statics.bulkImport = function (questionsData, ownerId, createdBy, batchId) {
    const questions = questionsData.map(data => ({
        ...data,
        testCenterOwner: ownerId,
        createdBy: createdBy,
        importBatch: batchId,
        stats: {
            timesUsed: 0,
            averageScore: 0,
            totalAttempts: 0,
            correctAttempts: 0
        }
    }));

    return this.insertMany(questions, { ordered: false });
};

const Question = mongoose.model('Question', questionSchema);
export default Question;