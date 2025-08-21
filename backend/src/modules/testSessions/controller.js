import { testSessionService } from './service.js';
import { logger } from '../../config/logger.js';

class TestSessionController {
    constructor() {
        this.testSessionService = testSessionService;
        this.logger = logger;
    }

    // Create a new test session
    createSession = async (req, res) => {
        try {
            const { testId } = req.params;
            const { accessCode, browserInfo } = req.body;
            const studentId = req.user._id;

            const session = await this.testSessionService.createSession(
                testId,
                studentId,
                browserInfo,
                accessCode
            );

            res.status(201).json({
                success: true,
                message: 'Test session created successfully',
                data: session
            });

        } catch (error) {
            this.logger.error('Create session error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create test session'
            });
        }
    };

    // Get session details
    getSession = async (req, res) => {
        try {
            const { sessionId } = req.params;
            const studentId = req.user.role === 'student' ? req.user._id : null;

            const session = await this.testSessionService.getSessionById(sessionId, studentId);

            res.status(200).json({
                success: true,
                data: session
            });

        } catch (error) {
            this.logger.error('Get session error:', error);
            res.status(404).json({
                success: false,
                message: error.message || 'Session not found'
            });
        }
    };

    // Submit answer for a question
    submitAnswer = async (req, res) => {
        try {
            const { sessionId, questionId } = req.params;
            const { answer, timeSpent } = req.body;
            const studentId = req.user.role === 'student' ? req.user._id : null;

            const session = await this.testSessionService.submitAnswer(
                sessionId,
                questionId,
                answer,
                timeSpent,
                studentId
            );

            res.status(200).json({
                success: true,
                message: 'Answer submitted successfully',
                data: {
                    sessionId: session._id,
                    totalAnswers: session.answers.length,
                    completionPercentage: session.completionPercentage
                }
            });

        } catch (error) {
            this.logger.error('Submit answer error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to submit answer'
            });
        }
    };

    // Complete test session
    completeSession = async (req, res) => {
        try {
            const { sessionId } = req.params;
            const studentId = req.user.role === 'student' ? req.user._id : null;

            const session = await this.testSessionService.completeSession(sessionId, studentId);

            res.status(200).json({
                success: true,
                message: 'Test session completed successfully',
                data: {
                    sessionId: session._id,
                    score: session.score,
                    isPassed: session.isPassed,
                    correctAnswers: session.correctAnswers,
                    incorrectAnswers: session.incorrectAnswers,
                    unansweredQuestions: session.unansweredQuestions,
                    duration: session.formattedDuration
                }
            });

        } catch (error) {
            this.logger.error('Complete session error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to complete session'
            });
        }
    };

    // Abandon test session
    abandonSession = async (req, res) => {
        try {
            const { sessionId } = req.params;
            const studentId = req.user.role === 'student' ? req.user._id : null;

            const session = await this.testSessionService.abandonSession(sessionId, studentId);

            res.status(200).json({
                success: true,
                message: 'Test session abandoned',
                data: {
                    sessionId: session._id,
                    status: session.status
                }
            });

        } catch (error) {
            this.logger.error('Abandon session error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to abandon session'
            });
        }
    };

    // Get sessions for a test (admin)
    getTestSessions = async (req, res) => {
        try {
            const { testId } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const options = {
                status: req.query.status,
                passed: req.query.passed === 'true' ? true : req.query.passed === 'false' ? false : undefined,
                flagged: req.query.flagged === 'true' ? true : req.query.flagged === 'false' ? false : undefined,
                reviewed: req.query.reviewed === 'true' ? true : req.query.reviewed === 'false' ? false : undefined,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                skip: ((parseInt(req.query.page) || 1) - 1) * (parseInt(req.query.limit) || 20),
                sort: req.query.sort || { createdAt: -1 }
            };

            const sessions = await this.testSessionService.getTestSessions(testId, ownerId, options);

            res.status(200).json({
                success: true,
                data: sessions
            });

        } catch (error) {
            this.logger.error('Get test sessions error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get test sessions'
            });
        }
    };

    // Get sessions for current student
    getMySessions = async (req, res) => {
        try {
            const studentId = req.user._id;

            const options = {
                status: req.query.status,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                skip: ((parseInt(req.query.page) || 1) - 1) * (parseInt(req.query.limit) || 10),
                sort: req.query.sort || { createdAt: -1 }
            };

            const sessions = await this.testSessionService.getStudentSessions(studentId, options);

            res.status(200).json({
                success: true,
                data: sessions
            });

        } catch (error) {
            this.logger.error('Get my sessions error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get sessions'
            });
        }
    };

    // Get test analytics (admin)
    getTestAnalytics = async (req, res) => {
        try {
            const { testId } = req.params;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const analytics = await this.testSessionService.getTestAnalytics(testId, ownerId);

            res.status(200).json({
                success: true,
                data: analytics
            });

        } catch (error) {
            this.logger.error('Get test analytics error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get test analytics'
            });
        }
    };

    // Flag session for review (admin)
    flagSession = async (req, res) => {
        try {
            const { sessionId } = req.params;
            const { reason } = req.body;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const session = await this.testSessionService.flagSession(sessionId, ownerId, reason);

            res.status(200).json({
                success: true,
                message: 'Session flagged for review',
                data: {
                    sessionId: session._id,
                    isFlagged: session.isFlagged,
                    flagReason: session.flagReason
                }
            });

        } catch (error) {
            this.logger.error('Flag session error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to flag session'
            });
        }
    };

    // Update admin notes (admin)
    updateAdminNotes = async (req, res) => {
        try {
            const { sessionId } = req.params;
            const { notes } = req.body;
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const session = await this.testSessionService.updateAdminNotes(sessionId, ownerId, notes);

            res.status(200).json({
                success: true,
                message: 'Admin notes updated successfully',
                data: {
                    sessionId: session._id,
                    adminNotes: session.adminNotes,
                    isReviewed: session.isReviewed
                }
            });

        } catch (error) {
            this.logger.error('Update admin notes error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update admin notes'
            });
        }
    };

    // Get owner statistics (admin)
    getOwnerStats = async (req, res) => {
        try {
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user._id
                : req.user.testCenterOwner;

            const stats = await this.testSessionService.getOwnerStats(ownerId);

            res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            this.logger.error('Get owner stats error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get owner statistics'
            });
        }
    };

    // Expire overdue sessions (admin/system)
    expireOverdueSessions = async (req, res) => {
        try {
            const expiredCount = await this.testSessionService.expireOverdueSessions();

            res.status(200).json({
                success: true,
                message: `Expired ${expiredCount} overdue sessions`,
                data: {
                    expiredCount
                }
            });

        } catch (error) {
            this.logger.error('Expire overdue sessions error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to expire overdue sessions'
            });
        }
    };
}

const testSessionController = new TestSessionController();
export { testSessionController };
