import mongoose from 'mongoose';

const { Schema } = mongoose;

// Test enrollment schema for managing student enrollments with payment and access codes
const testEnrollmentSchema = new Schema({
    // Core References
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

    // Payment Information
    paymentStatus: {
        type: String,
        enum: {
            values: ['pending', 'completed', 'failed', 'refunded'],
            message: 'Invalid payment status'
        },
        default: 'pending',
        index: true
    },

    paymentAmount: {
        type: Number,
        required: [true, 'Payment amount is required'],
        min: [0, 'Payment amount cannot be negative']
    },

    paymentMethod: {
        type: String,
        enum: {
            values: ['card', 'bank_transfer', 'cash', 'wallet', 'free'],
            message: 'Invalid payment method'
        }
    },

    transactionId: {
        type: String,
        trim: true,
        index: true
    },

    paymentReference: {
        type: String,
        trim: true
    },

    // Access Control
    accessCode: {
        type: String,
        required: [true, 'Access code is required'],
        unique: true,
        trim: true,
        uppercase: true,
        minlength: [6, 'Access code must be at least 6 characters'],
        maxlength: [16, 'Access code cannot exceed 16 characters'],
        index: true
    },

    accessCodeUsed: {
        type: Boolean,
        default: false,
        index: true
    },

    accessCodeUsedAt: {
        type: Date
    },

    // Enrollment Status
    enrollmentStatus: {
        type: String,
        enum: {
            values: ['enrolled', 'payment_pending', 'cancelled', 'expired', 'blocked'],
            message: 'Invalid enrollment status'
        },
        default: 'payment_pending',
        index: true
    },

    // Timestamps
    enrolledAt: {
        type: Date
    },

    expiresAt: {
        type: Date
    },

    cancelledAt: {
        type: Date
    },

    cancellationReason: {
        type: String,
        trim: true,
        maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
    },

    // Metadata
    enrollmentNotes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Enrollment notes cannot exceed 1000 characters']
    },

    // Relationships
    testCenterOwner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Test center owner is required'],
        index: true
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
testEnrollmentSchema.index({ test: 1, student: 1 }, { unique: true });
testEnrollmentSchema.index({ accessCode: 1, test: 1 });
testEnrollmentSchema.index({ testCenterOwner: 1, createdAt: -1 });
testEnrollmentSchema.index({ paymentStatus: 1, enrollmentStatus: 1 });
testEnrollmentSchema.index({ expiresAt: 1 }, { sparse: true });

// Virtual properties
testEnrollmentSchema.virtual('isActive').get(function () {
    return this.enrollmentStatus === 'enrolled' &&
        this.paymentStatus === 'completed' &&
        (!this.expiresAt || this.expiresAt > new Date());
});

testEnrollmentSchema.virtual('canTakeTest').get(function () {
    return this.isActive && !this.accessCodeUsed;
});

testEnrollmentSchema.virtual('daysUntilExpiry').get(function () {
    if (!this.expiresAt) return null;
    const now = new Date();
    const diffTime = this.expiresAt - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
testEnrollmentSchema.pre('save', function (next) {
    // Set enrolled timestamp when status changes to enrolled
    if (this.isModified('enrollmentStatus') && this.enrollmentStatus === 'enrolled') {
        this.enrolledAt = new Date();
    }

    // Set cancelled timestamp when status changes to cancelled
    if (this.isModified('enrollmentStatus') && this.enrollmentStatus === 'cancelled') {
        this.cancelledAt = new Date();
    }

    // Mark access code used timestamp
    if (this.isModified('accessCodeUsed') && this.accessCodeUsed && !this.accessCodeUsedAt) {
        this.accessCodeUsedAt = new Date();
    }

    next();
});

// Static methods
testEnrollmentSchema.statics.findByTest = function (testId, options = {}) {
    const query = { test: testId };

    if (options.enrollmentStatus) query.enrollmentStatus = options.enrollmentStatus;
    if (options.paymentStatus) query.paymentStatus = options.paymentStatus;

    return this.find(query)
        .populate('student', 'firstName lastName email studentRegNumber')
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

testEnrollmentSchema.statics.findByStudent = function (studentId, options = {}) {
    const query = { student: studentId };

    if (options.enrollmentStatus) query.enrollmentStatus = options.enrollmentStatus;
    if (options.paymentStatus) query.paymentStatus = options.paymentStatus;

    return this.find(query)
        .populate('test', 'title description duration enrollmentConfig schedule')
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 20)
        .skip(options.skip || 0);
};

testEnrollmentSchema.statics.findByAccessCode = function (accessCode) {
    return this.findOne({ accessCode: accessCode.toUpperCase() })
        .populate([
            { path: 'test', select: 'title description duration schedule status' },
            { path: 'student', select: 'firstName lastName email' }
        ]);
};

testEnrollmentSchema.statics.getEnrollmentStats = function (testId) {
    return this.aggregate([
        { $match: { test: new mongoose.Types.ObjectId(testId) } },
        {
            $group: {
                _id: {
                    enrollmentStatus: '$enrollmentStatus',
                    paymentStatus: '$paymentStatus'
                },
                count: { $sum: 1 },
                totalAmount: { $sum: '$paymentAmount' }
            }
        },
        {
            $group: {
                _id: null,
                statusBreakdown: {
                    $push: {
                        status: '$_id',
                        count: '$count',
                        amount: '$totalAmount'
                    }
                },
                totalEnrollments: { $sum: '$count' },
                totalRevenue: { $sum: '$totalAmount' }
            }
        }
    ]);
};

// Instance methods
testEnrollmentSchema.methods.generateNewAccessCode = async function () {
    const crypto = await import('crypto');
    let accessCode;
    let isUnique = false;

    while (!isUnique) {
        accessCode = crypto.randomBytes(8).toString('hex').toUpperCase();
        const existing = await this.constructor.findOne({ accessCode });
        if (!existing) isUnique = true;
    }

    this.accessCode = accessCode;
    return accessCode;
};

testEnrollmentSchema.methods.markPaymentCompleted = function (transactionId, paymentMethod) {
    this.paymentStatus = 'completed';
    this.enrollmentStatus = 'enrolled';
    this.transactionId = transactionId;
    this.paymentMethod = paymentMethod;
    return this.save();
};

testEnrollmentSchema.methods.cancel = function (reason) {
    this.enrollmentStatus = 'cancelled';
    this.cancellationReason = reason;
    this.cancelledAt = new Date();
    return this.save();
};

const TestEnrollment = mongoose.model('TestEnrollment', testEnrollmentSchema);

export default TestEnrollment;
