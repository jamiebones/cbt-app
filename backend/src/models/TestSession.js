import mongoose from 'mongoose';

const { Schema } = mongoose;

// Answer schema for storing individual question responses
const answerSchema = new Schema({
    question: {
        type: Schema.Types.ObjectId,
        ref: 'Question',
        required: [true, 'Question reference is required']
    },
    studentAnswer: {
        type: Schema.Types.Mixed, // Can be string, array, or object depending on question type
        required: [true, 'Student answer is required']
    },
    isCorrect: {
        type: Boolean,
        required: [true, 'Answer correctness is required']
    },
    points: {
        type: Number,
        default: 0,
        min: 0
    },
    timeSpent: {
        type: Number, // seconds spent on this question
        default: 0,
        min: 0
    }


}, { _id: false });

// Test session schema for storing individual student attempts
const testSessionSchema = new Schema({
    // Basic Information
    test: {
        type: Schema.Types.ObjectId,
        ref: 'Test',
        required: [true, 'Test reference is required'],
        index: true
    },

    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student reference is required'],
        index: true
    },

    // Session Details
    startTime: {
        type: Date,
        required: [true, 'Start time is required'],
        default: Date.now
    },

    endTime: {
        type: Date
    },

    duration: {
        type: Number, // in seconds
        default: 0,
        min: 0
    },

    // Session Status
    status: {
        type: String,
        enum: {
            values: ['in_progress', 'completed', 'abandoned', 'expired', 'submitted'],
            message: 'Invalid session status'
        },
        default: 'in_progress',
        index: true
    },

    // Student Answers
    answers: [answerSchema],

    // Questions assigned to this session
    questions: [{
        type: Schema.Types.ObjectId,
        ref: 'Question'
    }],

    // Results
    score: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    totalQuestions: {
        type: Number,
        required: [true, 'Total questions count is required'],
        min: 1
    },

    correctAnswers: {
        type: Number,
        default: 0,
        min: 0
    },

    incorrectAnswers: {
        type: Number,
        default: 0,
        min: 0
    },

    unansweredQuestions: {
        type: Number,
        default: 0,
        min: 0
    },

    isPassed: {
        type: Boolean,
        default: false
    },

    isReviewed: {
        type: Boolean,
        default: false
    },

    isFlagged: {
        type: Boolean,
        default: false
    },

    adminNotes: {
        type: String,
        maxlength: [1000, 'Admin note cannot exceed 1000 characters']
    },

    flagReason: {
        type: String,
        maxlength: [1000, 'Flag reason cannot exceed 1000 characters'],
        trim: true
    },

    // Browser/Security Information
    browserInfo: {
        userAgent: String,
        ipAddress: String,
        screenResolution: String
    },

    // Metadata
    testCenterOwner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Test center owner is required'],
        index: true
    },

    // Access code used to join the test
    accessCodeUsed: {
        type: String,
        trim: true
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

// Compound indexes for efficient queries
testSessionSchema.index({ test: 1, student: 1 }); // Find student's attempts for a test
testSessionSchema.index({ testCenterOwner: 1, createdAt: -1 }); // Admin dashboard queries
testSessionSchema.index({ status: 1, createdAt: -1 }); // Filter by status
testSessionSchema.index({ test: 1, status: 1 }); // Test analytics
testSessionSchema.index({ student: 1, createdAt: -1 }); // Student history
testSessionSchema.index({ isPassed: 1, test: 1 }); // Pass rate analytics

// Virtual properties
testSessionSchema.virtual('completionPercentage').get(function () {
    if (this.totalQuestions === 0) return 0;
    return Math.round((this.answers.length / this.totalQuestions) * 100);
});

testSessionSchema.virtual('timeEfficiency').get(function () {
    if (!this.endTime || !this.startTime || this.totalQuestions === 0) return null;
    const totalTime = (this.endTime - this.startTime) / 1000; // seconds
    return Math.round(totalTime / this.totalQuestions); // seconds per question
});


testSessionSchema.virtual('formattedDuration').get(function () {
    if (!this.duration) return '0m 0s';
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = this.duration % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
});

// Instance methods
testSessionSchema.methods.submitAnswer = async function (questionId, studentAnswer, timeSpent = 0) {
    // Validate that the question belongs to this session
    if (!this.questions.includes(questionId)) {
        throw new Error('Question does not belong to this test session');
    }

    // Get the question to validate the answer
    const Question = mongoose.model('Question');
    const question = await Question.findById(questionId);
    if (!question) {
        throw new Error('Question not found');
    }

    // Validate the answer and get results
    const answerResult = question.checkAnswer(studentAnswer);

    // Check if answer already exists for this question
    const existingAnswerIndex = this.answers.findIndex(a =>
        a.question.toString() === questionId.toString()
    );

    const answerData = {
        question: questionId,
        studentAnswer: studentAnswer,
        isCorrect: answerResult.isCorrect,
        points: answerResult.score || 0,
        timeSpent: timeSpent
    };

    if (existingAnswerIndex >= 0) {
        // Update existing answer
        this.answers[existingAnswerIndex] = answerData;
    } else {
        // Add new answer
        this.answers.push(answerData);
    }

    // Save the session
    await this.save();

    return answerResult;
};

testSessionSchema.methods.calculateResults = async function () {
    // Calculate basic statistics
    this.correctAnswers = this.answers.filter(a => a.isCorrect).length;
    this.incorrectAnswers = this.answers.filter(a => !a.isCorrect).length;
    this.unansweredQuestions = this.totalQuestions - this.answers.length;

    // Calculate score
    this.score = this.totalQuestions > 0 ?
        Math.round((this.correctAnswers / this.totalQuestions) * 100) : 0;

    // Check if passed
    const Test = mongoose.model('Test');
    const test = await Test.findById(this.test);
    if (test) {
        this.isPassed = this.score >= test.passingScore;
    }

    return this;
};

testSessionSchema.methods.complete = async function () {
    this.status = 'completed';
    this.endTime = new Date();
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);

    // Calculate results
    await this.calculateResults();

    // Update test statistics
    const Test = mongoose.model('Test');
    const test = await Test.findById(this.test);
    if (test) {
        await test.updateStatsFromSession(this._id);
    }

    return this.save();
};

testSessionSchema.methods.abandon = function () {
    this.status = 'abandoned';
    this.endTime = new Date();
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
    return this.save();
};

testSessionSchema.methods.expire = function () {
    this.status = 'expired';
    this.endTime = new Date();
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);

    return this.save();
};

testSessionSchema.methods.flagForReview = function (reason) {
    this.isFlagged = true;
    this.flagReason = reason;

    return this.save();
};

// Static methods
testSessionSchema.statics.findByTest = function (testId, options = {}) {
    const query = { test: testId };

    if (options.status) query.status = options.status;
    if (options.passed !== undefined) query.isPassed = options.passed;
    if (options.flagged !== undefined) query.isFlagged = options.flagged;
    if (options.reviewed !== undefined) query.isReviewed = options.reviewed;

    return this.find(query)
        .populate('student', 'firstName lastName email')
        .populate('test', 'title passingScore')
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

testSessionSchema.statics.findByStudent = function (studentId, options = {}) {
    const query = { student: studentId };

    if (options.testCenterOwner) query.testCenterOwner = options.testCenterOwner;
    if (options.status) query.status = options.status;

    return this.find(query)
        .populate('test', 'title description passingScore')
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 20)
        .skip(options.skip || 0);
};

testSessionSchema.statics.getTestAnalytics = function (testId) {
    return this.aggregate([
        { $match: { test: new mongoose.Types.ObjectId(testId) } },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                completedSessions: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                averageScore: { $avg: '$score' },
                highestScore: { $max: '$score' },
                lowestScore: { $min: '$score' },
                passRate: {
                    $avg: { $cond: ['$isPassed', 1, 0] }
                },
                averageDuration: { $avg: '$duration' },
                abandonedSessions: {
                    $sum: { $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0] }
                }
            }
        }
    ]);
};

testSessionSchema.statics.getQuestionAnalytics = function (testId) {
    return this.aggregate([
        { $match: { test: new mongoose.Types.ObjectId(testId), status: 'completed' } },
        { $unwind: '$answers' },
        {
            $group: {
                _id: '$answers.question',
                totalAttempts: { $sum: 1 },
                correctAttempts: {
                    $sum: { $cond: ['$answers.isCorrect', 1, 0] }
                },
                averageTimeSpent: { $avg: '$answers.timeSpent' },
                changedAnswers: {
                    $sum: { $cond: ['$answers.isChanged', 1, 0] }
                }
            }
        },
        {
            $addFields: {
                successRate: {
                    $multiply: [
                        { $divide: ['$correctAttempts', '$totalAttempts'] },
                        100
                    ]
                }
            }
        },
        {
            $lookup: {
                from: 'questions',
                localField: '_id',
                foreignField: '_id',
                as: 'questionInfo'
            }
        },
        {
            $sort: { successRate: 1 } // Hardest questions first
        }
    ]);
};

testSessionSchema.statics.getOwnerStats = function (ownerId) {
    return this.aggregate([
        { $match: { testCenterOwner: new mongoose.Types.ObjectId(ownerId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                averageScore: { $avg: '$score' },
                totalDuration: { $sum: '$duration' }
            }
        }
    ]);
};

const TestSession = mongoose.model('TestSession', testSessionSchema);

export default TestSession;
