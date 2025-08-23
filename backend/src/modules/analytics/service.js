import mongoose from 'mongoose';
import { TestSession, Test, User, Question, Subject } from '../../models/index.js';
import { logger } from '../../config/logger.js';

class AnalyticsService {
    constructor() {
        this.logger = logger;
    }

    /**
     * Get comprehensive test analytics
     * @param {string} testId - Test ID to analyze
     * @param {Object} options - Analysis options
     * @returns {Object} Test analytics data
     */
    async getTestAnalytics(testId, options = {}) {
        try {
            const {
                includeQuestionAnalytics = true,
                includeStudentPerformance = true,
                includeTimeAnalytics = true,
                dateRange = null
            } = options;

            // Build base query with optional date filtering
            const baseQuery = { test: new mongoose.Types.ObjectId(testId) };
            if (dateRange) {
                baseQuery.createdAt = {
                    $gte: new Date(dateRange.start),
                    $lte: new Date(dateRange.end)
                };
            }

            // Parallel execution for better performance
            const [
                basicStats,
                questionStats,
                studentPerformance,
                timeAnalytics,
                testInfo
            ] = await Promise.all([
                this._getBasicTestStats(baseQuery),
                includeQuestionAnalytics ? this._getQuestionAnalytics(testId, baseQuery) : null,
                includeStudentPerformance ? this._getStudentPerformanceStats(baseQuery) : null,
                includeTimeAnalytics ? this._getTimeAnalytics(baseQuery) : null,
                Test.findById(testId).select('title description totalQuestions passingScore').lean()
            ]);

            return {
                test: testInfo,
                basicStats: basicStats[0] || this._getEmptyBasicStats(),
                questionAnalytics: questionStats || [],
                studentPerformance: studentPerformance || [],
                timeAnalytics: timeAnalytics || null,
                generatedAt: new Date(),
                dateRange: dateRange || { start: null, end: null }
            };

        } catch (error) {
            this.logger.error('Error getting test analytics:', error);
            throw new Error('Failed to retrieve test analytics');
        }
    }

    /**
     * Get test center performance analytics
     * @param {string} centerId - Test center owner ID
     * @param {Object} options - Analysis options
     * @returns {Object} Center performance data
     */
    async getCenterPerformance(centerId, options = {}) {
        try {
            const { period = '30d' } = options;

            const dateRange = this._getDateRangeFromPeriod(period);
            const baseQuery = {
                testCenterOwner: new mongoose.Types.ObjectId(centerId),
                createdAt: {
                    $gte: dateRange.start,
                    $lte: dateRange.end
                }
            };

            const [overallStats, centerInfo] = await Promise.all([
                this._getCenterOverallStats(baseQuery),
                User.findById(centerId).select('firstName lastName email businessName').lean()
            ]);

            return {
                center: centerInfo,
                period,
                dateRange,
                overallStats: overallStats[0] || this._getEmptyCenterStats(),
                generatedAt: new Date()
            };

        } catch (error) {
            this.logger.error('Error getting center performance:', error);
            throw new Error('Failed to retrieve center performance data');
        }
    }

    /**
     * Get student performance analytics
     * @param {string} studentId - Student ID
     * @param {string} centerId - Test center owner ID (for filtering)
     * @param {Object} options - Analysis options
     * @returns {Object} Student performance data
     */
    async getStudentPerformance(studentId, centerId, options = {}) {
        try {
            const baseQuery = {
                student: new mongoose.Types.ObjectId(studentId),
                testCenterOwner: new mongoose.Types.ObjectId(centerId),
                status: 'completed'
            };

            const [overallStats, studentInfo] = await Promise.all([
                this._getStudentPerformanceStats(baseQuery),
                User.findById(studentId).select('firstName lastName email').lean()
            ]);

            return {
                student: studentInfo,
                overallStats: overallStats[0] || this._getEmptyStudentStats(),
                generatedAt: new Date()
            };

        } catch (error) {
            this.logger.error('Error getting student performance:', error);
            throw new Error('Failed to retrieve student performance data');
        }
    }

    /**
     * Generate performance reports
     * @param {string} centerId - Test center owner ID
     * @param {Object} reportOptions - Report configuration
     * @returns {Object} Generated report data
     */
    async generatePerformanceReport(centerId, reportOptions = {}) {
        try {
            const { period = '30d' } = reportOptions;

            const dateRange = this._getDateRangeFromPeriod(period);
            const baseQuery = {
                testCenterOwner: new mongoose.Types.ObjectId(centerId),
                createdAt: {
                    $gte: dateRange.start,
                    $lte: dateRange.end
                }
            };

            // Get basic center performance data for the report
            const [overallStats, centerInfo] = await Promise.all([
                this._getCenterOverallStats(baseQuery),
                User.findById(centerId).select('firstName lastName email businessName').lean()
            ]);

            const reportData = {
                center: centerInfo,
                overallStats: overallStats[0] || this._getEmptyCenterStats(),
                metadata: {
                    reportType: 'basic',
                    period,
                    dateRange,
                    generatedAt: new Date(),
                    generatedBy: centerId
                }
            };

            return reportData;

        } catch (error) {
            this.logger.error('Error generating performance report:', error);
            throw new Error('Failed to generate performance report');
        }
    }

    /**
     * Get real-time analytics dashboard data
     * @param {string} centerId - Test center owner ID
     * @returns {Object} Dashboard analytics
     */
    async getDashboardAnalytics(centerId) {
        try {
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const baseQuery = { testCenterOwner: new mongoose.Types.ObjectId(centerId) };

            const [last24hStats, last7dStats] = await Promise.all([
                this._getDashboardStats({ ...baseQuery, createdAt: { $gte: last24h } }),
                this._getDashboardStats({ ...baseQuery, createdAt: { $gte: last7d } })
            ]);

            return {
                last24Hours: last24hStats[0] || this._getEmptyDashboardStats(),
                last7Days: last7dStats[0] || this._getEmptyDashboardStats(),
                generatedAt: now
            };

        } catch (error) {
            this.logger.error('Error getting dashboard analytics:', error);
            throw new Error('Failed to retrieve dashboard analytics');
        }
    }

    // Private helper methods for aggregation queries

    async _getBasicTestStats(query) {
        return TestSession.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalAttempts: { $sum: 1 },
                    completedAttempts: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    averageScore: {
                        $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$score', null] }
                    },
                    highestScore: {
                        $max: { $cond: [{ $eq: ['$status', 'completed'] }, '$score', null] }
                    },
                    lowestScore: {
                        $min: { $cond: [{ $eq: ['$status', 'completed'] }, '$score', null] }
                    },
                    passRate: {
                        $avg: {
                            $cond: [
                                { $and: [{ $eq: ['$status', 'completed'] }, '$isPassed'] },
                                1,
                                { $cond: [{ $eq: ['$status', 'completed'] }, 0, null] }
                            ]
                        }
                    },
                    averageDuration: {
                        $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$duration', null] }
                    },
                    abandonmentRate: {
                        $avg: { $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0] }
                    }
                }
            }
        ]);
    }

    async _getQuestionAnalytics(testId, query) {
        return TestSession.aggregate([
            { $match: { ...query, test: new mongoose.Types.ObjectId(testId), status: 'completed' } },
            { $unwind: '$answers' },
            {
                $group: {
                    _id: '$answers.question',
                    totalAttempts: { $sum: 1 },
                    correctAttempts: {
                        $sum: { $cond: ['$answers.isCorrect', 1, 0] }
                    },
                    averageTimeSpent: { $avg: '$answers.timeSpent' },
                    averagePoints: { $avg: '$answers.points' }
                }
            },
            {
                $addFields: {
                    successRate: {
                        $multiply: [
                            { $divide: ['$correctAttempts', '$totalAttempts'] },
                            100
                        ]
                    },
                    difficulty: {
                        $switch: {
                            branches: [
                                { case: { $gte: [{ $divide: ['$correctAttempts', '$totalAttempts'] }, 0.8] }, then: 'Easy' },
                                { case: { $gte: [{ $divide: ['$correctAttempts', '$totalAttempts'] }, 0.5] }, then: 'Medium' },
                                { case: { $lt: [{ $divide: ['$correctAttempts', '$totalAttempts'] }, 0.5] }, then: 'Hard' }
                            ],
                            default: 'Unknown'
                        }
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
            { $unwind: { path: '$questionInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    questionId: '$_id',
                    questionText: { $substr: ['$questionInfo.questionText', 0, 100] },
                    questionType: '$questionInfo.type',
                    subject: '$questionInfo.subject',
                    totalAttempts: 1,
                    correctAttempts: 1,
                    successRate: 1,
                    difficulty: 1,
                    averageTimeSpent: 1,
                    averagePoints: 1
                }
            },
            { $sort: { successRate: 1 } } // Hardest questions first
        ]);
    }

    async _getStudentPerformanceStats(query) {
        return TestSession.aggregate([
            { $match: { ...query, status: 'completed' } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentInfo'
                }
            },
            { $unwind: '$studentInfo' },
            {
                $group: {
                    _id: '$student',
                    studentName: { $first: { $concat: ['$studentInfo.firstName', ' ', '$studentInfo.lastName'] } },
                    studentEmail: { $first: '$studentInfo.email' },
                    totalAttempts: { $sum: 1 },
                    averageScore: { $avg: '$score' },
                    highestScore: { $max: '$score' },
                    totalPassed: { $sum: { $cond: ['$isPassed', 1, 0] } },
                    totalDuration: { $sum: '$duration' },
                    lastAttempt: { $max: '$createdAt' }
                }
            },
            {
                $addFields: {
                    passRate: {
                        $multiply: [
                            { $divide: ['$totalPassed', '$totalAttempts'] },
                            100
                        ]
                    },
                    averageDuration: { $divide: ['$totalDuration', '$totalAttempts'] }
                }
            },
            { $sort: { averageScore: -1 } }
        ]);
    }

    async _getTimeAnalytics(query) {
        // Get basic time statistics
        const timeStats = await TestSession.aggregate([
            { $match: { ...query, status: 'completed' } },
            {
                $group: {
                    _id: null,
                    averageCompletionTime: { $avg: '$duration' },
                    fastestCompletion: { $min: '$duration' },
                    slowestCompletion: { $max: '$duration' },
                    timeDistribution: {
                        $push: {
                            duration: '$duration',
                            score: '$score'
                        }
                    },
                    totalSessions: { $sum: 1 }
                }
            }
        ]);

        if (!timeStats[0] || timeStats[0].totalSessions === 0) {
            return null;
        }

        const result = timeStats[0];

        // Calculate median separately using a simpler approach
        const durations = await TestSession.find({ ...query, status: 'completed' }, 'duration')
            .sort({ duration: 1 })
            .lean();

        if (durations.length > 0) {
            const midIndex = Math.floor(durations.length / 2);
            result.medianCompletionTime = durations.length % 2 === 0
                ? (durations[midIndex - 1].duration + durations[midIndex].duration) / 2
                : durations[midIndex].duration;
        } else {
            result.medianCompletionTime = null;
        }

        return result;
    }

    _getDateRangeFromPeriod(period) {
        const now = new Date();
        let start;

        switch (period) {
            case '7d':
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default: // 30d
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        return { start, end: now };
    }

    _getEmptyBasicStats() {
        return {
            totalAttempts: 0,
            completedAttempts: 0,
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0,
            passRate: 0,
            averageDuration: 0,
            abandonmentRate: 0
        };
    }

    _getEmptyCenterStats() {
        return {
            totalTests: 0,
            totalSessions: 0,
            completedSessions: 0,
            averageScore: 0,
            passRate: 0,
            totalStudents: 0,
            activeStudents: 0
        };
    }

    _getEmptyStudentStats() {
        return {
            totalAttempts: 0,
            averageScore: 0,
            highestScore: 0,
            passRate: 0,
            totalDuration: 0
        };
    }

    _getEmptyDashboardStats() {
        return {
            sessions: 0,
            completedSessions: 0,
            averageScore: 0,
            newStudents: 0
        };
    }

    // Additional helper methods for comprehensive analytics...
    async _getCenterOverallStats(query) {
        return TestSession.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalSessions: { $sum: 1 },
                    completedSessions: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    averageScore: {
                        $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$score', null] }
                    },
                    passRate: {
                        $avg: {
                            $cond: [
                                { $and: [{ $eq: ['$status', 'completed'] }, '$isPassed'] },
                                1,
                                { $cond: [{ $eq: ['$status', 'completed'] }, 0, null] }
                            ]
                        }
                    },
                    uniqueStudents: { $addToSet: '$student' },
                    uniqueTests: { $addToSet: '$test' }
                }
            },
            {
                $addFields: {
                    totalStudents: { $size: '$uniqueStudents' },
                    totalTests: { $size: '$uniqueTests' }
                }
            },
            {
                $project: {
                    uniqueStudents: 0,
                    uniqueTests: 0
                }
            }
        ]);
    }

    async _getDashboardStats(query) {
        return TestSession.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    sessions: { $sum: 1 },
                    completedSessions: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    averageScore: {
                        $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$score', null] }
                    },
                    newStudents: { $addToSet: '$student' }
                }
            },
            {
                $addFields: {
                    newStudents: { $size: '$newStudents' }
                }
            }
        ]);
    }
}

const analyticsService = new AnalyticsService();

export { analyticsService };
