import mongoose from 'mongoose';

const { Schema } = mongoose;

// Test schema with comprehensive validation
const testSchema = new Schema({
    // Basic Information
    title: {
        type: String,
        required: [true, 'Test title is required'],
        trim: true,
        maxlength: [500, 'Test title cannot exceed 500 characters']
    },

    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Test description cannot exceed 1000 characters']
    },

    instructions: {
        type: String,
        trim: true,
        maxlength: [2000, 'Test instructions cannot exceed 2000 characters']
    },

    // Test Configuration
    duration: {
        type: Number, // in minutes
        required: [true, 'Test duration is required'],
        min: [1, 'Test duration must be at least 1 minute'],
        max: [480, 'Test duration cannot exceed 8 hours']
    },

    totalQuestions: {
        type: Number,
        required: [true, 'Total questions count is required'],
        min: [1, 'Test must have at least 1 question']
    },

    passingScore: {
        type: Number,
        required: [true, 'Passing score is required'],
        min: [0, 'Passing score cannot be negative'],
        max: [100, 'Passing score cannot exceed 100%']
    },

    // Question Selection Method
    questionSelectionMethod: {
        type: String,
        enum: {
            values: ['manual', 'auto', 'mixed'],
            message: 'Selection method must be manual, auto, or mixed'
        },
        default: 'manual'
    },

    testTakers: {
        type: [Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },

    // Auto-selection configuration (when questionSelectionMethod is 'auto' or 'mixed')
    autoSelectionConfig: {
        questionCount: {
            type: Number,
            min: 1
        },
        difficultyDistribution: {
            easy: { type: Number, default: 0 },
            medium: { type: Number, default: 0 },
            hard: { type: Number, default: 0 }
        }
    },

    // Test Settings
    settings: {
        shuffleQuestions: {
            type: Boolean,
            default: true
        },
        shuffleAnswers: {
            type: Boolean,
            default: true
        },
        showResultsImmediately: {
            type: Boolean,
            default: false
        },
        allowReview: {
            type: Boolean,
            default: true
        },
        allowCalculator: {
            type: Boolean,
            default: false
        },
        showQuestionNavigation: {
            type: Boolean,
            default: true
        },
        preventCopyPaste: {
            type: Boolean,
            default: true
        },
        fullScreenMode: {
            type: Boolean,
            default: false
        }
    },

    // Scheduling
    schedule: {
        startDate: {
            type: Date,
            required: [true, 'Test start date is required']
        },
        endDate: {
            type: Date,
            required: [true, 'Test end date is required'],
            validate: {
                validator: function (endDate) {
                    return endDate > this.schedule.startDate;
                },
                message: 'End date must be after start date'
            }
        },

    },

    // Status and Visibility
    status: {
        type: String,
        enum: {
            values: ['draft', 'published', 'active', 'completed', 'archived'],
            message: 'Invalid test status'
        },
        default: 'draft'
    },

    // Access Control
    accessCode: {
        type: String,
        trim: true,
        maxlength: [20, 'Access code cannot exceed 20 characters']
    },

    // Relationships
    testCenterOwner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Test center owner is required'],
        index: true
    },

    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Test creator is required']
    },

    subject: {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
        required: [true, 'Test subject is required']
    },

    // Questions (for manual selection)
    questions: [{
        type: Schema.Types.ObjectId,
        ref: 'Question'
    }],

    // Enrollment Configuration
    enrollmentConfig: {
        isEnrollmentRequired: {
            type: Boolean,
            default: false
        },
        enrollmentFee: {
            type: Number,
            default: 0,
            min: [0, 'Enrollment fee cannot be negative']
        },
        maxEnrollments: {
            type: Number,
            default: -1, // -1 = unlimited
            min: [-1, 'Max enrollments cannot be less than -1']
        },
        enrollmentDeadline: {
            type: Date
        },
        allowLateEnrollment: {
            type: Boolean,
            default: false
        },
        requirePayment: {
            type: Boolean,
            default: function () {
                return this.enrollmentFee > 0;
            }
        },
        autoApprove: {
            type: Boolean,
            default: true
        }
    },

    // Test Statistics
    stats: {
        totalAttempts: {
            type: Number,
            default: 0
        },
        completedAttempts: {
            type: Number,
            default: 0
        },
        averageScore: {
            type: Number,
            default: 0
        },
        highestScore: {
            type: Number,
            default: 0
        },
        lowestScore: {
            type: Number,
            default: 100
        }
    },

    // Enrollment Statistics
    enrollmentStats: {
        totalEnrolled: {
            type: Number,
            default: 0
        },
        paidEnrollments: {
            type: Number,
            default: 0
        },
        pendingPayments: {
            type: Number,
            default: 0
        },
        totalRevenue: {
            type: Number,
            default: 0
        }
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
testSchema.index({ testCenterOwner: 1, status: 1 });
testSchema.index({ createdBy: 1 });
testSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
testSchema.index({ status: 1, isPublic: 1 });
testSchema.index({ subject: 1 });
testSchema.index({ createdAt: -1 });
testSchema.index({ title: 'text', description: 'text' }); // Text search

// Virtual for test duration in human readable format
testSchema.virtual('durationFormatted').get(function () {
    const hours = Math.floor(this.duration / 60);
    const minutes = this.duration % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
});

// Virtual for test status check
testSchema.virtual('isActive').get(function () {
    const now = new Date();
    return this.status === 'active' &&
        this.schedule.startDate <= now &&
        this.schedule.endDate >= now;
});

// Virtual for test completion check
testSchema.virtual('isCompleted').get(function () {
    return this.status === 'completed' ||
        (this.schedule.endDate < new Date());
});

// Virtual for question count validation
testSchema.virtual('hasValidQuestionCount').get(function () {
    if (this.questionSelectionMethod === 'manual') {
        return this.questions.length === this.totalQuestions;
    }
    if (this.questionSelectionMethod === 'auto') {
        return this.autoSelectionConfig.questionCount === this.totalQuestions;
    }
    return true; // Mixed method is validated separately
});

// Pre-save middleware
testSchema.pre('save', function (next) {
    // Update lastModified timestamp
    this.lastModified = new Date();

    // Validate question selection configuration
    if (this.questionSelectionMethod === 'auto' || this.questionSelectionMethod === 'mixed') {
        if (!this.autoSelectionConfig.questionCount || this.autoSelectionConfig.questionCount <= 0) {
            next(new Error('Auto selection requires question count configuration'));
            return;
        }
    }

    // Validate access code uniqueness if provided
    if (this.accessCode && this.isModified('accessCode')) {
        this.constructor.findOne({
            accessCode: this.accessCode,
            _id: { $ne: this._id },
            testCenterOwner: this.testCenterOwner
        }).then(test => {
            if (test) {
                next(new Error('Access code must be unique within test center'));
            } else {
                next();
            }
        }).catch(err => {
            next(err);
        });
        return;
    }

    next();
});

// Instance methods
testSchema.methods.canBeStarted = function () {
    const now = new Date();
    return this.status === 'published' &&
        this.schedule.startDate <= now &&
        this.schedule.endDate >= now &&
        this.hasValidQuestionCount;
};

testSchema.methods.getSelectedQuestions = async function () {
    if (this.questionSelectionMethod === 'manual') {
        await this.populate('questions');
        return this.questions;
    }

    if (this.questionSelectionMethod === 'auto') {
        // Implement auto-selection logic for single subject
        const Question = mongoose.model('Question');
        const questions = await Question.aggregate([
            {
                $match: {
                    subject: this.subject,
                    testCenterOwner: this.testCenterOwner,
                    isActive: true
                }
            },
            { $sample: { size: this.totalQuestions } }
        ]);

        return questions;
    }

    // Mixed method - combine manual and auto
    await this.populate('questions');
    const manualQuestions = this.questions;
    const autoCount = this.totalQuestions - manualQuestions.length;

    if (autoCount > 0) {
        const Question = mongoose.model('Question');
        const autoQuestions = await Question.aggregate([
            {
                $match: {
                    _id: { $nin: this.questions },
                    subject: this.subject,
                    testCenterOwner: this.testCenterOwner,
                    isActive: true
                }
            },
            { $sample: { size: autoCount } }
        ]);
        return [...manualQuestions, ...autoQuestions];
    }

    return manualQuestions;
};

testSchema.methods.updateStats = function (sessionResults) {
    this.stats.totalAttempts += 1;
    if (sessionResults.isCompleted) {
        this.stats.completedAttempts += 1;
        const score = sessionResults.score;

        // Update score statistics
        if (this.stats.completedAttempts === 1) {
            this.stats.averageScore = score;
            this.stats.highestScore = score;
            this.stats.lowestScore = score;
        } else {
            this.stats.averageScore = (
                (this.stats.averageScore * (this.stats.completedAttempts - 1)) + score
            ) / this.stats.completedAttempts;

            this.stats.highestScore = Math.max(this.stats.highestScore, score);
            this.stats.lowestScore = Math.min(this.stats.lowestScore, score);
        }
    }

    return this.save();
};

// New method to update stats from TestSession
testSchema.methods.updateStatsFromSession = async function (sessionId) {
    const TestSession = mongoose.model('TestSession');
    const session = await TestSession.findById(sessionId);

    if (!session) return this;

    this.stats.totalAttempts += 1;

    if (session.status === 'completed') {
        this.stats.completedAttempts += 1;
        const score = session.score;

        // Update score statistics
        if (this.stats.completedAttempts === 1) {
            this.stats.averageScore = score;
            this.stats.highestScore = score;
            this.stats.lowestScore = score;
        } else {
            this.stats.averageScore = (
                (this.stats.averageScore * (this.stats.completedAttempts - 1)) + score
            ) / this.stats.completedAttempts;

            this.stats.highestScore = Math.max(this.stats.highestScore, score);
            this.stats.lowestScore = Math.min(this.stats.lowestScore, score);
        }
    }

    return this.save();
};

// Static methods
testSchema.statics.findByOwner = function (ownerId, options = {}) {
    const query = { testCenterOwner: ownerId };

    if (options.status) {
        query.status = options.status;
    }

    if (options.search) {
        query.$text = { $search: options.search };
    }

    return this.find(query)
        .populate('createdBy', 'firstName lastName')
        .populate('subject', 'name')
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

testSchema.statics.findActiveTests = function (ownerId) {
    const now = new Date();
    return this.find({
        testCenterOwner: ownerId,
        status: 'published',
        'schedule.startDate': { $lte: now },
        'schedule.endDate': { $gte: now }
    }).populate('subject', 'name');
};

testSchema.statics.getTestStats = function (ownerId) {
    return this.aggregate([
        { $match: { testCenterOwner: new mongoose.Types.ObjectId(ownerId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAttempts: { $sum: '$stats.totalAttempts' },
                avgScore: { $avg: '$stats.averageScore' }
            }
        }
    ]);
};

const Test = mongoose.model('Test', testSchema);

export default Test;
