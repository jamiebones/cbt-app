import mongoose from 'mongoose';

const { Schema } = mongoose;

// Subject schema for question categorization
const subjectSchema = new Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Subject name is required'],
        trim: true,
        maxlength: [100, 'Subject name cannot exceed 100 characters']
    },

    code: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [20, 'Subject code cannot exceed 20 characters'],
        validate: {
            validator: function (code) {
                return !code || /^[A-Z0-9_]+$/.test(code);
            },
            message: 'Subject code can only contain uppercase letters, numbers, and underscores'
        }
    },

    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Subject description cannot exceed 500 characters']
    },

    // Categorization
    category: {
        type: String,
        trim: true,
        maxlength: [50, 'Category cannot exceed 50 characters'],
        default: 'General'
    },

    // Color coding for UI
    color: {
        type: String,
        trim: true,
        default: '#3B82F6', // Blue
        validate: {
            validator: function (color) {
                return /^#[0-9A-F]{6}$/i.test(color);
            },
            message: 'Color must be a valid hex color code'
        }
    },

    // Ownership
    testCenterOwner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Test center owner is required'],
        index: true
    },

    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Subject creator is required']
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Subject ordering/priority
    order: {
        type: Number,
        default: 0
    },

    // Statistics
    stats: {
        questionCount: {
            type: Number,
            default: 0
        },
        testCount: {
            type: Number,
            default: 0
        },
        averageDifficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium'
        }
    },

    // Metadata
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'Tag cannot exceed 30 characters']
    }]

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

// Compound indexes for performance and uniqueness
subjectSchema.index({ testCenterOwner: 1, name: 1 }, { unique: true });
subjectSchema.index({ testCenterOwner: 1, code: 1 }, { unique: true, sparse: true });
subjectSchema.index({ createdBy: 1 });
subjectSchema.index({ category: 1 });
subjectSchema.index({ isActive: 1 });
subjectSchema.index({ order: 1 });

// Text index for search
subjectSchema.index({ name: 'text', description: 'text' });

// Virtual for display name (code + name)
subjectSchema.virtual('displayName').get(function () {
    if (this.code) {
        return `${this.code} - ${this.name}`;
    }
    return this.name;
});

// Virtual for color contrast (for text readability)
subjectSchema.virtual('textColor').get(function () {
    // Calculate if we need dark or light text based on background color
    const hex = this.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
});

// Pre-save middleware
subjectSchema.pre('save', async function (next) {
    // Auto-generate code if not provided
    if (!this.code && this.isNew) {
        const baseCode = this.name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 6);

        // Check for uniqueness and add number if needed
        let code = baseCode;
        let counter = 1;
        let isUnique = false;

        while (!isUnique && counter <= 99) {
            const existing = await this.constructor.findOne({
                testCenterOwner: this.testCenterOwner,
                code: code,
                _id: { $ne: this._id }
            });

            if (!existing) {
                isUnique = true;
                this.code = code;
            } else {
                code = `${baseCode}${counter}`;
                counter++;
            }
        }

        if (!isUnique) {
            // Fallback to timestamp-based code
            this.code = `${baseCode}${Date.now().toString().slice(-4)}`;
        }
    }

    next();
});

// Post-save middleware to update stats
subjectSchema.post('save', async function (doc) {
    if (doc.isNew) {
        // Update question and test counts for the new subject
        await doc.updateStats();
    }
});

// Instance methods
subjectSchema.methods.updateStats = async function () {
    const Question = mongoose.model('Question');
    const Test = mongoose.model('Test');

    // Count questions in this subject
    const questionCount = await Question.countDocuments({
        subject: this._id,
        isActive: true
    });

    // Count tests using this subject
    const testCount = await Test.countDocuments({
        subjects: this._id,
        status: { $ne: 'archived' }
    });

    // Calculate average difficulty
    const difficultyStats = await Question.aggregate([
        { $match: { subject: this._id, isActive: true } },
        {
            $group: {
                _id: '$difficulty',
                count: { $sum: 1 }
            }
        }
    ]);

    let averageDifficulty = 'medium';
    if (difficultyStats.length > 0) {
        const maxDifficulty = difficultyStats.reduce((prev, current) =>
            prev.count > current.count ? prev : current
        );
        averageDifficulty = maxDifficulty._id;
    }

    // Update stats
    this.stats.questionCount = questionCount;
    this.stats.testCount = testCount;
    this.stats.averageDifficulty = averageDifficulty;

    return this.save();
};

subjectSchema.methods.getQuestionsWithFilter = function (filter = {}) {
    const Question = mongoose.model('Question');
    return Question.find({
        subject: this._id,
        isActive: true,
        ...filter
    }).populate('createdBy', 'firstName lastName');
};

subjectSchema.methods.getQuestionsByDifficulty = function () {
    const Question = mongoose.model('Question');
    return Question.aggregate([
        { $match: { subject: this._id, isActive: true } },
        {
            $group: {
                _id: '$difficulty',
                count: { $sum: 1 },
                avgScore: { $avg: '$stats.averageScore' }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

subjectSchema.methods.canBeDeleted = async function () {
    const Question = mongoose.model('Question');
    const Test = mongoose.model('Test');

    // Check if any questions exist
    const questionCount = await Question.countDocuments({
        subject: this._id,
        isActive: true
    });

    // Check if any active tests use this subject
    const testCount = await Test.countDocuments({
        subjects: this._id,
        status: { $in: ['published', 'active'] }
    });

    return questionCount === 0 && testCount === 0;
};

// Static methods
subjectSchema.statics.findByOwner = function (ownerId, options = {}) {
    const query = { testCenterOwner: ownerId, isActive: true };

    if (options.category) {
        query.category = options.category;
    }

    if (options.search) {
        query.$text = { $search: options.search };
    }

    return this.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort(options.sort || { order: 1, name: 1 })
        .limit(options.limit || 100)
        .skip(options.skip || 0);
};

subjectSchema.statics.getCategories = function (ownerId) {
    return this.distinct('category', {
        testCenterOwner: ownerId,
        isActive: true
    });
};

subjectSchema.statics.getSubjectStats = function (ownerId) {
    return this.aggregate([
        { $match: { testCenterOwner: mongoose.Types.ObjectId(ownerId), isActive: true } },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalQuestions: { $sum: '$stats.questionCount' },
                totalTests: { $sum: '$stats.testCount' }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

subjectSchema.statics.bulkUpdateOrder = function (ownerId, orderUpdates) {
    const bulkOps = orderUpdates.map(update => ({
        updateOne: {
            filter: {
                _id: mongoose.Types.ObjectId(update.id),
                testCenterOwner: ownerId
            },
            update: { $set: { order: update.order } }
        }
    }));

    return this.bulkWrite(bulkOps);
};

subjectSchema.statics.createDefault = async function (ownerId, createdBy) {
    const defaultSubjects = [
        { name: 'Mathematics', category: 'STEM', color: '#3B82F6', order: 1 },
        { name: 'English Language', category: 'Language', color: '#10B981', order: 2 },
        { name: 'Science', category: 'STEM', color: '#8B5CF6', order: 3 },
        { name: 'Social Studies', category: 'Humanities', color: '#F59E0B', order: 4 },
        { name: 'General Knowledge', category: 'General', color: '#EF4444', order: 5 }
    ];

    const subjects = defaultSubjects.map(subject => ({
        ...subject,
        testCenterOwner: ownerId,
        createdBy: createdBy,
        stats: {
            questionCount: 0,
            testCount: 0,
            averageDifficulty: 'medium'
        }
    }));

    return this.insertMany(subjects, { ordered: false });
};

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;
