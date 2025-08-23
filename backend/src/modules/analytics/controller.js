import { logger } from '../../config/logger.js';
import { analyticsService } from './service.js';

class AnalyticsController {
    constructor() {
        this.service = analyticsService;
    }

    getTestResults = async (req, res) => {
        try {
            const { testId } = req.params;
            const {
                includeQuestionAnalytics = 'true',
                includeStudentPerformance = 'true',
                includeTimeAnalytics = 'true',
                dateStart,
                dateEnd
            } = req.query;

            // Build options from query parameters
            const options = {
                includeQuestionAnalytics: includeQuestionAnalytics === 'true',
                includeStudentPerformance: includeStudentPerformance === 'true',
                includeTimeAnalytics: includeTimeAnalytics === 'true'
            };

            // Add date range if provided
            if (dateStart && dateEnd) {
                options.dateRange = {
                    start: dateStart,
                    end: dateEnd
                };
            }

            const analytics = await this.service.getTestAnalytics(testId, options);

            res.status(200).json({
                success: true,
                data: analytics
            });

        } catch (error) {
            logger.error('Error in getTestResults:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to retrieve test results'
            });
        }
    };

    getCenterPerformance = async (req, res) => {
        try {
            const { centerId } = req.params;
            const {
                period = '30d',
                includeTestBreakdown = 'true',
                includeStudentMetrics = 'true'
            } = req.query;

            // Validate that user can access this center's data
            if (req.user.id !== centerId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to center performance data'
                });
            }

            const options = {
                period,
                includeTestBreakdown: includeTestBreakdown === 'true',
                includeStudentMetrics: includeStudentMetrics === 'true'
            };

            const performance = await this.service.getCenterPerformance(centerId, options);

            res.status(200).json({
                success: true,
                data: performance
            });

        } catch (error) {
            logger.error('Error in getCenterPerformance:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to retrieve center performance'
            });
        }
    };

    getStudentPerformance = async (req, res) => {
        try {
            const { studentId } = req.params;
            const { centerId } = req.query;

            // Use authenticated user's center if not specified
            const centerOwnerId = centerId || req.user.id;

            // Validate access permissions
            if (req.user.role === 'student' && req.user.id !== studentId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to student performance data'
                });
            }

            if (req.user.role === 'test_center_owner' && req.user.id !== centerOwnerId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this center\'s data'
                });
            }

            const options = {
                includeTestHistory: req.query.includeTestHistory !== 'false',
                includeSubjectAnalysis: req.query.includeSubjectAnalysis !== 'false',
                includeProgressTrend: req.query.includeProgressTrend !== 'false',
                limit: parseInt(req.query.limit) || 50
            };

            const performance = await this.service.getStudentPerformance(studentId, centerOwnerId, options);

            res.status(200).json({
                success: true,
                data: performance
            });

        } catch (error) {
            logger.error('Error in getStudentPerformance:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to retrieve student performance'
            });
        }
    };

    generateReports = async (req, res) => {
        try {
            const { centerId } = req.params;
            const {
                reportType = 'comprehensive',
                period = '30d',
                format = 'json',
                testIds
            } = req.query;

            // Validate access permissions
            if (req.user.id !== centerId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to generate reports for this center'
                });
            }

            const reportOptions = {
                reportType,
                period,
                format,
                testIds: testIds ? testIds.split(',') : null
            };

            const report = await this.service.generatePerformanceReport(centerId, reportOptions);

            res.status(200).json({
                success: true,
                data: report
            });

        } catch (error) {
            logger.error('Error in generateReports:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to generate report'
            });
        }
    };

    getDashboardAnalytics = async (req, res) => {
        try {
            const { centerId } = req.params || { centerId: req.user.id };

            // Validate access permissions
            if (req.user.id !== centerId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to dashboard analytics'
                });
            }

            const analytics = await this.service.getDashboardAnalytics(centerId);

            res.status(200).json({
                success: true,
                data: analytics
            });

        } catch (error) {
            logger.error('Error in getDashboardAnalytics:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to retrieve dashboard analytics'
            });
        }
    };

    exportResultsCSV = async (req, res) => {
        try {
            const { testId } = req.params;

            // Get test analytics with all details
            const analytics = await this.service.getTestAnalytics(testId, {
                includeQuestionAnalytics: true,
                includeStudentPerformance: true,
                includeTimeAnalytics: true
            });

            // Format data for CSV export
            const csvData = this._formatAnalyticsForCSV(analytics);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="test-results-${testId}.csv"`);
            res.status(200).send(csvData);

        } catch (error) {
            logger.error('Error in exportResultsCSV:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to export CSV'
            });
        }
    };

    exportResultsPDF = async (req, res) => {
        try {
            const { testId } = req.params;

            res.status(501).json({
                success: false,
                message: 'PDF export not implemented yet - requires PDF generation library'
            });

        } catch (error) {
            logger.error('Error in exportResultsPDF:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to export PDF'
            });
        }
    };

    // Helper method to format analytics data as CSV
    _formatAnalyticsForCSV(analytics) {
        const lines = [];

        // Header
        lines.push('Test Analytics Report');
        lines.push(`Generated: ${analytics.generatedAt}`);
        lines.push(`Test: ${analytics.test?.title || 'Unknown'}`);
        lines.push('');

        // Basic Stats
        lines.push('BASIC STATISTICS');
        lines.push('Metric,Value');
        const stats = analytics.basicStats;
        lines.push(`Total Attempts,${stats.totalAttempts}`);
        lines.push(`Completed Attempts,${stats.completedAttempts}`);
        lines.push(`Average Score,${stats.averageScore?.toFixed(2) || 0}%`);
        lines.push(`Pass Rate,${(stats.passRate * 100)?.toFixed(2) || 0}%`);
        lines.push(`Average Duration,${Math.round(stats.averageDuration / 60) || 0} minutes`);
        lines.push('');

        // Student Performance
        if (analytics.studentPerformance?.length > 0) {
            lines.push('STUDENT PERFORMANCE');
            lines.push('Student Name,Email,Attempts,Average Score,Highest Score,Pass Rate');
            analytics.studentPerformance.forEach(student => {
                lines.push(`"${student.studentName}","${student.studentEmail}",${student.totalAttempts},${student.averageScore?.toFixed(2)}%,${student.highestScore}%,${student.passRate?.toFixed(2)}%`);
            });
            lines.push('');
        }

        // Question Analytics
        if (analytics.questionAnalytics?.length > 0) {
            lines.push('QUESTION ANALYTICS');
            lines.push('Question,Type,Success Rate,Difficulty,Average Time,Total Attempts');
            analytics.questionAnalytics.forEach(q => {
                const questionText = q.questionText?.replace(/"/g, '""') || 'Question text not available';
                lines.push(`"${questionText}","${q.questionType}",${q.successRate?.toFixed(2)}%,"${q.difficulty}",${Math.round(q.averageTimeSpent)} seconds,${q.totalAttempts}`);
            });
        }

        return lines.join('\n');
    }
}

const analyticsController = new AnalyticsController();

export { analyticsController };