import { TestSession, Test, Question } from '../../models/index.js';
import { logger } from '../../config/logger.js';

class TestSessionService {
    // Create a new test session or resume existing one
    async createSession(testId, studentId, browserInfo = {}, accessCode = null) {
        logger.info(`Creating test session for test: ${testId}, student: ${studentId}`);

        try {
            // Parallel execution for better performance
            const [test, existingSession] = await Promise.all([
                Test.findById(testId).populate('subject'),
                TestSession.findOne({
                    test: testId,
                    student: studentId,
                    status: 'in_progress'
                })
            ]);

            if (!test) {
                throw new Error('Test not found');
            }

            // Validate access code if test requires one
            if (test.accessCode) {
                if (!accessCode) {
                    throw new Error('Access code is required for this test');
                }
                if (test.accessCode !== accessCode) {
                    throw new Error('Invalid access code');
                }
            }

            if (!test.canBeStarted()) {
                throw new Error('Test cannot be started at this time');
            }

            // Resume existing session with preserved state
            if (existingSession) {
                logger.info(`Resuming existing session: ${existingSession._id}`);

                // Calculate remaining time based on test duration and elapsed time
                const now = new Date();
                const elapsedTime = Math.floor((now - existingSession.startTime) / 1000); // seconds
                const totalTestDuration = test.duration * 60; // convert minutes to seconds
                const timeRemaining = Math.max(0, totalTestDuration - elapsedTime);

                // Update browser info if changed
                existingSession.browserInfo = {
                    ...existingSession.browserInfo,
                    userAgent: browserInfo?.userAgent || existingSession.browserInfo.userAgent,
                    ipAddress: browserInfo?.ipAddress || existingSession.browserInfo.ipAddress,
                    screenResolution: browserInfo?.screenResolution || existingSession.browserInfo.screenResolution
                };

                await existingSession.save();

                return {
                    ...existingSession.toObject(),
                    resumedSession: true,
                    timeRemaining,
                    currentQuestionIndex: existingSession.currentQuestionIndex || 0,
                    savedAnswers: existingSession.answers || []
                };
            }

            // Get questions for new session
            const questions = await test.getSelectedQuestions();

            // Create new session with enhanced tracking
            const session = new TestSession({
                test: testId,
                student: studentId,
                questions: questions.map(q => q._id),
                totalQuestions: questions.length,
                testCenterOwner: test.testCenterOwner,
                startTime: new Date(),
                endTime: new Date(Date.now() + (test.duration * 60 * 1000)),
                accessCodeUsed: accessCode,
                browserInfo: {
                    userAgent: browserInfo?.userAgent || '',
                    ipAddress: browserInfo?.ipAddress || '',
                    screenResolution: browserInfo?.screenResolution || ''
                }
            });

            await session.save();

            logger.info(`Test session created successfully: ${session._id}`);
            return {
                ...session.toObject(),
                resumedSession: false
            };

        } catch (error) {
            logger.error('Failed to create test session:', error);
            throw error;
        }
    }

    // Get session by ID with populated data
    async getSessionById(sessionId, studentId = null) {
        logger.info(`Getting session: ${sessionId}`);
        try {
            const query = { _id: sessionId };
            if (studentId) {
                query.student = studentId; // Ensure student can only access their own sessions
            }

            const session = await TestSession.findOne(query)
                .populate('test', 'title description duration passingScore')
                .populate('student', 'firstName lastName email');

            if (!session) {
                throw new Error('Session not found');
            }

            return session;

        } catch (error) {
            logger.error('Failed to get session:', error);
            throw error;
        }
    }

    // Submit answer for a question with enhanced state tracking
    async submitAnswer(sessionId, questionId, answer, timeSpent = 0, studentId = null, questionIndex = null) {
        logger.info(`Submitting answer for session: ${sessionId}, question: ${questionId}`);
        try {
            const query = { _id: sessionId, status: 'in_progress' };
            if (studentId) {
                query.student = studentId;
            }

            const session = await TestSession.findOne(query);
            if (!session) {
                throw new Error('Session not found or completed');
            }

            // Calculate remaining time
            const now = new Date();
            //const elapsedTime = Math.floor((now - session.startTime) / 1000);
            const timeRemaining = Math.max(0, session.timeRemaining - timeSpent);

            // Find existing answer or create new one
            const existingAnswerIndex = session.answers.findIndex(
                a => a.questionId.equals(questionId)
            );

            const answerData = {
                questionId,
                selectedAnswer: answer,
                timeSpent: timeSpent,
                answeredAt: now,
                flaggedForReview: false
            };

            if (existingAnswerIndex >= 0) {
                // Update existing answer
                session.answers[existingAnswerIndex] = {
                    ...session.answers[existingAnswerIndex],
                    ...answerData,
                    timeSpent: session.answers[existingAnswerIndex].timeSpent + timeSpent
                };
            } else {
                // Add new answer
                session.answers.push(answerData);
            }

            // Update session progress
            session.timeRemaining = timeRemaining;
            session.lastActiveTime = now;

            // Update current question index if provided
            if (questionIndex !== null) {
                session.currentQuestionIndex = questionIndex;
            }

            // Auto-save progress
            await session.save();

            logger.info(`Answer submitted and progress saved for session: ${sessionId}`);

            return {
                success: true,
                timeRemaining,
                currentQuestionIndex: session.currentQuestionIndex,
                totalAnswered: session.answers.length,
                autoSaved: true
            };

        } catch (error) {
            logger.error('Failed to submit answer:', error);
            throw error;
        }
    }

    // Auto-save session progress (called periodically from frontend)
    async autoSaveProgress(sessionId, currentQuestionIndex, timeRemaining, studentId = null) {
        logger.info(`Auto-saving progress for session: ${sessionId}`);

        try {
            const query = { _id: sessionId, status: 'in_progress' };
            if (studentId) {
                query.student = studentId;
            }

            const session = await TestSession.findOneAndUpdate(
                query,
                {
                    currentQuestionIndex,
                    timeRemaining,
                    lastActiveTime: new Date()
                },
                { new: true }
            );

            if (!session) {
                throw new Error('Session not found');
            }

            return {
                success: true,
                lastSaved: new Date(),
                timeRemaining: session.timeRemaining
            };

        } catch (error) {
            logger.error('Failed to auto-save progress:', error);
            throw error;
        }
    }

    // Get session progress and state for resumption
    async getSessionProgress(sessionId, studentId = null) {
        logger.info(`Getting session progress: ${sessionId}`);

        try {
            const query = { _id: sessionId };
            if (studentId) {
                query.student = studentId;
            }

            const session = await TestSession.findOne(query)
                .populate('test', 'title description duration passingScore')
                .populate('student', 'firstName lastName email');

            if (!session) {
                throw new Error('Session not found');
            }

            // Calculate current time remaining
            const now = new Date();
            let timeRemaining = session.timeRemaining;

            if (session.status === 'in_progress') {
                const lastActiveTime = session.lastActiveTime || session.startTime;
                const inactiveTime = Math.floor((now - lastActiveTime) / 1000);
                timeRemaining = Math.max(0, session.timeRemaining - inactiveTime);
            }

            return {
                session: session.toObject(),
                progress: {
                    currentQuestionIndex: session.currentQuestionIndex || 0,
                    timeRemaining,
                    totalQuestions: session.totalQuestions,
                    answeredQuestions: session.answers.length,
                    savedAnswers: session.answers,
                    canResume: session.status === 'in_progress'
                }
            };

        } catch (error) {
            logger.error('Failed to get session progress:', error);
            throw error;
        }
    }

    // Complete test session
    async completeSession(sessionId, studentId = null) {
        logger.info(`Completing session: ${sessionId}`);

        try {
            const query = { _id: sessionId, status: 'in_progress' };
            if (studentId) {
                query.student = studentId;
            }

            const session = await TestSession.findOne(query);
            if (!session) {
                throw new Error('Session not found or already completed');
            }

            await session.complete();

            logger.info(`Session completed successfully: ${sessionId}`);
            return session;

        } catch (error) {
            logger.error('Failed to complete session:', error);
            throw error;
        }
    }

    // Abandon test session
    async abandonSession(sessionId, studentId = null) {
        logger.info(`Abandoning session: ${sessionId}`);

        try {
            const query = { _id: sessionId, status: 'in_progress' };
            if (studentId) {
                query.student = studentId;
            }

            const session = await TestSession.findOne(query);
            if (!session) {
                throw new Error('Session not found');
            }

            await session.abandon();

            logger.info(`Session abandoned: ${sessionId}`);
            return session;

        } catch (error) {
            logger.error('Failed to abandon session:', error);
            throw error;
        }
    }

    // Get sessions for a test (admin)
    async getTestSessions(testId, ownerId, options = {}) {
        logger.info(`Getting sessions for test: ${testId}`);

        try {
            // Verify test ownership
            const test = await Test.findOne({ _id: testId, testCenterOwner: ownerId });
            if (!test) {
                throw new Error('Test not found or access denied');
            }
            const sessions = await TestSession.findByTest(testId, options);
            return sessions;

        } catch (error) {
            logger.error('Failed to get test sessions:', error);
            throw error;
        }
    }

    // Get sessions for a student
    async getStudentSessions(studentId, options = {}) {
        logger.info(`Getting sessions for student: ${studentId}`);

        try {
            const sessions = await TestSession.findByStudent(studentId, options);
            return sessions;

        } catch (error) {
            logger.error('Failed to get student sessions:', error);
            throw error;
        }
    }

    // Get test analytics (admin)
    async getTestAnalytics(testId, ownerId) {
        logger.info(`Getting analytics for test: ${testId}`);

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
            logger.error('Failed to get test analytics:', error);
            throw error;
        }
    }

    // Flag session for review (admin)
    async flagSession(sessionId, ownerId, reason) {
        logger.info(`Flagging session for review: ${sessionId}`);

        try {
            const session = await TestSession.findOne({
                _id: sessionId,
                testCenterOwner: ownerId
            });

            if (!session) {
                throw new Error('Session not found or access denied');
            }

            await session.flagForReview(reason);

            logger.info(`Session flagged successfully: ${sessionId}`);
            return session;

        } catch (error) {
            logger.error('Failed to flag session:', error);
            throw error;
        }
    }

    // Update admin notes (admin)
    async updateAdminNotes(sessionId, ownerId, notes) {
        logger.info(`Updating admin notes for session: ${sessionId}`);

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

            logger.info(`Admin notes updated successfully: ${sessionId}`);
            return session;

        } catch (error) {
            logger.error('Failed to update admin notes:', error);
            throw error;
        }
    }

    // Get owner statistics (admin)
    async getOwnerStats(ownerId) {
        logger.info(`Getting owner statistics: ${ownerId}`);

        try {
            const stats = await TestSession.getOwnerStats(ownerId);
            return stats;

        } catch (error) {
            logger.error('Failed to get owner stats:', error);
            throw error;
        }
    }

    // Auto-expire sessions that have exceeded test duration
    async expireOverdueSessions() {
        logger.info('Checking for overdue sessions to expire');

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
                        logger.info(`Expired overdue session: ${session._id}`);
                    }
                }
            }

            logger.info(`Expired ${expiredCount} overdue sessions`);
            return expiredCount;

        } catch (error) {
            logger.error('Failed to expire overdue sessions:', error);
            throw error;
        }
    }
}

const testSessionService = new TestSessionService();
export { testSessionService };
