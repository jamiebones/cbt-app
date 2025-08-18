import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

// User schema with role-based validation
const userSchema = new Schema({
    // Basic Information
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function (email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Please provide a valid email address'
        }
    },

    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },

    // Profile Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },

    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },

    phoneNumber: {
        type: String,
        trim: true,
        validate: {
            validator: function (phone) {
                return !phone || /^[\+]?[1-9][\d]{0,15}$/.test(phone);
            },
            message: 'Please provide a valid phone number'
        }
    },

    // Role-based Information
    role: {
        type: String,
        required: [true, 'User role is required'],
        enum: {
            values: ['test_center_owner', 'test_creator', 'student'],
            message: 'Role must be either test_center_owner, test_creator, or student'
        }
    },

    // Test Center Owner specific fields
    testCenterName: {
        type: String,
        trim: true,
        maxlength: [150, 'Test center name cannot exceed 150 characters'],
        required: function () {
            return this.role === 'test_center_owner';
        }
    },

    testCenterAddress: {
        street: {
            type: String,
            trim: true,
            maxlength: [200, 'Street address cannot exceed 200 characters']
        },
        city: {
            type: String,
            trim: true,
            maxlength: [50, 'City cannot exceed 50 characters']
        },
        state: {
            type: String,
            trim: true,
            maxlength: [50, 'State cannot exceed 50 characters']
        },
        country: {
            type: String,
            trim: true,
            maxlength: [50, 'Country cannot exceed 50 characters']
        }
    },

    // Student specific fields
    studentRegNumber: {
        type: String,
        trim: true,
        unique: true,
        sparse: true, // Allows multiple null values
        maxlength: [50, 'Student ID cannot exceed 50 characters'],
        required: function () {
            return this.role === 'student';
        }
    },

 
    // Subscription Information (for test center owners)
    subscriptionTier: {
        type: String,
        enum: {
            values: ['free', 'premium'],
            message: 'Subscription tier must be free or premium'
        },
        default: 'free'
    },

  
    subscriptionLimits: {
        maxTests: {
            type: Number,
            default: 5 // Free tier limit
        },
        maxStudentsPerTest: {
            type: Number,
            default: 50 // Free tier limit
        },
        maxQuestionsPerTest: {
            type: Number,
            default: 100 // Free tier limit
        },
        canImportExcel: {
            type: Boolean,
            default: true 
        },
        canUseAnalytics: {
            type: Boolean,
            default: true // Free tier restriction
        }
    },

    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },

    isEmailVerified: {
        type: Boolean,
        default: false
    },

    emailVerificationToken: {
        type: String,
        select: false // Don't include in queries by default
    },

    passwordResetToken: {
        type: String,
        select: false
    },

    passwordResetExpires: {
        type: Date,
        select: false
    },

    // Relationship fields
    testCenterOwner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        validate: {
            validator: function (ownerId) {
                // Only students and test creators can have a test center owner
                return this.role === 'test_center_owner' || ownerId;
            },
            message: 'Test creators and students must be associated with a test center owner'
        }
    },

    // Activity tracking
    lastLogin: {
        type: Date
    },

    loginAttempts: {
        type: Number,
        default: 0
    },

    accountLockedUntil: {
        type: Date
    },

}, {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            delete ret.password;
            delete ret.emailVerificationToken;
            delete ret.passwordResetToken;
            delete ret.passwordResetExpires;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ studentRegNumber: 1 }, { sparse: true });
userSchema.index({ testCenterOwner: 1 });
userSchema.index({ subscriptionTier: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
    return !!(this.accountLockedUntil && this.accountLockedUntil > Date.now());
});

// Pre-save middleware
userSchema.pre('save', async function (next) {
    // Hash password if modified
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
    }

    // Set subscription limits based on tier
    if (this.isModified('subscriptionTier')) {
        switch (this.subscriptionTier) {
            case 'free':
                this.subscriptionLimits = {
                    maxTests: 5,
                    maxStudentsPerTest: 50,
                    maxQuestionsPerTest: 100,
                    canImportExcel: true,
                    canUseAnalytics: true
                };
                break;
            case 'premium':
                this.subscriptionLimits = {
                    maxTests: -1,
                    maxStudentsPerTest: -1,
                    maxQuestionsPerTest: -1,
                    canImportExcel: true,
                    canUseAnalytics: true
                };
                break;
        }
    }

    next();
});

// Instance methods
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementLoginAttempts = function () {
    // Max 10 attempts before locking for 30 minutes
    if (this.loginAttempts + 1 >= 10 && !this.isLocked) {
        this.accountLockedUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
    }
    this.loginAttempts += 1;
    return this.save();
};

userSchema.methods.resetLoginAttempts = function () {
    this.loginAttempts = 0;
    this.accountLockedUntil = undefined;
    return this.save();
};

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

    this.passwordResetToken = resetToken;
    this.passwordResetExpires = Date.now() + 20 * 60 * 1000; // 20 minutes

    return resetToken;
};

userSchema.methods.hasPermission = function (permission) {
    const permissions = {
        test_center_owner: [
            'create_tests', 'manage_users', 'view_analytics',
            'manage_subscription', 'import_excel', 'export_data'
        ],
        test_creator: [
            'create_tests', 'manage_questions', 'view_test_results'
        ],
        student: [
            'take_tests', 'view_results'
        ]
    };

    return permissions[this.role]?.includes(permission) || false;
};

userSchema.methods.isSubscriptionActive = function () {
    return this.subscriptionExpiry > new Date();
};

userSchema.methods.canCreateTest = function (currentTestCount = 0) {
    if (!this.isSubscriptionActive()) return false;
    if (this.subscriptionLimits.maxTests === -1) return true; // Unlimited
    return currentTestCount < this.subscriptionLimits.maxTests;
};

// Static methods
userSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findTestCenterOwners = function () {
    return this.find({ role: 'test_center_owner' });
};

userSchema.statics.findStudentsByOwner = function (ownerId) {
    return this.find({
        role: 'student',
        testCenterOwner: ownerId
    });
};

userSchema.statics.getSubscriptionStats = function () {
    return this.aggregate([
        {
            $group: {
                _id: '$subscriptionTier',
                count: { $sum: 1 },
                activeUsers: {
                    $sum: {
                        $cond: [
                            { $gt: ['$subscriptionExpiry', new Date()] },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);
};

const User = mongoose.model('User', userSchema);

export default User;
