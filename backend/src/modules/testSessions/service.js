import { TestSession, Test, Question } from '../../models/index.js';
import { logger } from '../../config/logger.js';

class TestSessionService {
    constructor() {
        this.logger = logger;
    }

    // Create a new test session
    async createSession(testId, studentId, browserInfo = {}, accessCode = null) {
        this.logger.info(`Creating test session for test: ${testId}, student: ${studentId}`);

        try {
            // Verify test exists and is available
            const test = await Test.findById(testId).populate('subject');
            if (!test) {
                throw new Error('Test not found');
            }

            if (!test.canBeStarted()) {
                throw new Error('Test cannot be started at this time');
            }

            // Check if student already has an active session for this test
            const existingSession = await TestSession.findOne({
                test: testId,
                student: studentId,
                status: { $in: ['in_progress'] }
            });

            if (existingSession) {
                this.logger.info(`Resuming existing session: ${existingSession._id}`);
                return existingSession;
            }

            // Get questions for the test
            const questions = await test.getSelectedQuestions();

            // Create new session
            const session = new TestSession({
                test: testId,
                student: studentId,
                questions: questions.map(q => q._id), // Store question IDs
                totalQuestions: questions.length,
                testCenterOwner: test.testCenterOwner,
                startTime: new Date(),
                endTime: new Date(Date.now() + (test.duration * 60 * 1000)), // Add test duration
                accessCodeUsed: accessCode,
                browserInfo: {
                    userAgent: browserInfo?.userAgent || '',
                    ipAddress: browserInfo?.ipAddress || '',
                    screenResolution: browserInfo?.screenResolution || ''
                }
            });

            await session.save();

            this.logger.info(`Test session created successfully: ${session._id}`);
            return session;

        } catch (error) {
            this.logger.error('Failed to create test session:', error);
            throw error;
        }
    }

    // Get session by ID with populated data
    async getSessionById(sessionId, studentId = null) {
        this.logger.info(`Getting session: ${sessionId}`);

        try {
            const query = { _id: sessionId };
            if (studentId) {
                query.student = studentId; // Ensure student can only access their own sessions
            }

            const session = await TestSession.findOne(query)
                .populate('test', 'title description duration passingScore')
                .populate('student', 'firstName lastName email');

            if (!session) {
                throw new Error('Session not found or access denied');
            }

            return session;

        } catch (error) {
            this.logger.error('Failed to get session:', error);
            throw error;
        }
    }

    // Submit answer for a question
    async submitAnswer(sessionId, questionId, answer, timeSpent = 0, studentId = null) {
        this.logger.info(`Submitting answer for session: ${sessionId}, question: ${questionId}`);

        try {
            const query = { _id: sessionId, status: 'in_progress' };
            if (studentId) {
                query.student = studentId;
            }

            const session = await TestSession.findOne(query);
            if (!session) {
                throw new Error('Session not found, completed, or access denied');
            }

            // Submit the answer
            await session.submitAnswer(questionId, answer, timeSpent);

            this.logger.info(`Answer submitted successfully for session: ${sessionId}`);
            return session;

        } catch (error) {
            this.logger.error('Failed to submit answer:', error);
            throw error;
        }
    }

    // Complete test session
    async completeSession(sessionId, studentId = null) {
        this.logger.info(`Completing session: ${sessionId}`);

        try {
            const query = { _id: sessionId, status: 'in_progress' };
            if (studentId) {
                query.student = studentId;
            }

            const session = await TestSession.findOne(query);
            if (!session) {
                throw new Error('Session not found, already completed, or access denied');
            }

            await session.complete();

            this.logger.info(`Session completed successfully: ${sessionId}`);
            return session;

        } catch (error) {
            this.logger.error('Failed to complete session:', error);
            throw error;
        }
    }

    // Abandon test session
    async abandonSession(sessionId, studentId = null) {
        this.logger.info(`Abandoning session: ${sessionId}`);

        try {
            const query = { _id: sessionId, status: 'in_progress' };
            if (studentId) {
                query.student = studentId;
            }

            const session = await TestSession.findOne(query);
            if (!session) {
                throw new Error('Session not found or access denied');
            }

            await session.abandon();

            this.logger.info(`Session abandoned: ${sessionId}`);
            return session;

        } catch (error) {
            this.logger.error('Failed to abandon session:', error);
            throw error;
        }
    }

    // Get sessions for a test (admin)
    async getTestSessions(testId, ownerId, options = {}) {
        this.logger.info(`Getting sessions for test: ${testId}`);

        try {
            // Verify test ownership
            const test = await Test.findOne({ _id: testId, testCenterOwner: ownerId });
            if (!test) {
                throw new Error('Test not found or access denied');
            }

            const sessions = await TestSession.findByTest(testId, options);
            return sessions;

        } catch (error) {
            this.logger.error('Failed to get test sessions:', error);
            throw error;
        }
    }

    // Get sessions for a student
    async getStudentSessions(studentId, options = {}) {
        this.logger.info(`Getting sessions for student: ${studentId}`);

        try {
            const sessions = await TestSession.findByStudent(studentId, options);
            return sessions;

        } catch (error) {
            this.logger.error('Failed to get student sessions:', error);
            throw error;
        }
    }

    // Get test analytics (admin)
    async getTestAnalytics(testId, ownerId) {
        this.logger.info(`Getting analytics for test: ${testId}`);

        try {
            // Verify test ownership
            const test = await Test.findOne({ _id: testId, testCenterOwner: ownerId });
            if (!test) {
                throw new Error('Test not found or access denied');
            }

            const analytics = await TestSession.getTestAnalytics(testId);
            const questionAnalytics = await TestSession.getQuestionAnalytics(testId);

            return {
                testAnalytics: analytics[0] || {},
                questionAnalytics: questionAnalytics
            };

        } catch (error) {
            this.logger.error('Failed to get test analytics:', error);
            throw error;
        }
    }

    // Flag session for review (admin)
    async flagSession(sessionId, ownerId, reason) {
        this.logger.info(`Flagging session for review: ${sessionId}`);

        try {
            const session = await TestSession.findOne({
                _id: sessionId,
                testCenterOwner: ownerId
            });

            if (!session) {
                throw new Error('Session not found or access denied');
            }

            await session.flagForReview(reason);

            this.logger.info(`Session flagged successfully: ${sessionId}`);
            return session;

        } catch (error) {
            this.logger.error('Failed to flag session:', error);
            throw error;
        }
    }

    // Update admin notes (admin)
    async updateAdminNotes(sessionId, ownerId, notes) {
        this.logger.info(`Updating admin notes for session: ${sessionId}`);

        try {
            const session = await TestSession.findOneAndUpdate(
                {
                    _id: sessionId,
                    testCenterOwner: ownerId
                },
                {
                    adminNotes: notes,
                    isReviewed: true
                },
                { new: true }
            );

            if (!session) {
                throw new Error('Session not found or access denied');
            }

            this.logger.info(`Admin notes updated successfully: ${sessionId}`);
            return session;

        } catch (error) {
            this.logger.error('Failed to update admin notes:', error);
            throw error;
        }
    }

    // Get owner statistics (admin)
    async getOwnerStats(ownerId) {
        this.logger.info(`Getting owner statistics: ${ownerId}`);

        try {
            const stats = await TestSession.getOwnerStats(ownerId);
            return stats;

        } catch (error) {
            this.logger.error('Failed to get owner stats:', error);
            throw error;
        }
    }

    // Auto-expire sessions that have exceeded test duration
    async expireOverdueSessions() {
        this.logger.info('Checking for overdue sessions to expire');

        try {
            // Find sessions that are in progress and have exceeded their test duration
            const sessions = await TestSession.find({
                status: 'in_progress'
            }).populate('test', 'duration');

            let expiredCount = 0;

            for (const session of sessions) {
                if (session.test && session.test.duration) {
                    const maxDuration = session.test.duration * 60; // Convert minutes to seconds
                    const elapsed = (new Date() - session.startTime) / 1000; // Elapsed time in seconds

                    if (elapsed > maxDuration) {
                        await session.expire();
                        expiredCount++;
                        this.logger.info(`Expired overdue session: ${session._id}`);
                    }
                }
            }

            this.logger.info(`Expired ${expiredCount} overdue sessions`);
            return expiredCount;

        } catch (error) {
            this.logger.error('Failed to expire overdue sessions:', error);
            throw error;
        }
    }
}

const testSessionService = new TestSessionService();
export { testSessionService };
