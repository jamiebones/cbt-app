import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { TestSession, Test, Question, Subject, User } from '../models/index.js';
import { testSessionService } from '../modules/testSessions/service.js';

// Test database setup
const MONGO_URI = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/cbt_test';

describe('TestSession Functionality Tests', () => {
    let testUser;
    let testSubject;
    let testQuestions;
    let testTest;
    let testSession;

    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect(MONGO_URI);

        // Clean up test data
        await Promise.all([
            TestSession.deleteMany({}),
            Test.deleteMany({}),
            Question.deleteMany({}),
            Subject.deleteMany({}),
            User.deleteMany({})
        ]);
    });

    afterAll(async () => {
        // Clean up and close connection
        await Promise.all([
            TestSession.deleteMany({}),
            Test.deleteMany({}),
            Question.deleteMany({}),
            Subject.deleteMany({}),
            User.deleteMany({})
        ]);
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Create test user
        testUser = new User({
            firstName: 'Test',
            lastName: 'User',
            email: 'testuser@testsession.com',
            password: 'testpass123',
            role: 'student',
            studentRegNumber: 'TEST2025001',
            isActive: true
        });
        await testUser.save();

        // Create test center owner
        const testOwner = new User({
            firstName: 'Test',
            lastName: 'Owner',
            email: 'owner@testsession.com',
            password: 'testpass123',
            role: 'test_center_owner',
            isActive: true,
            testCenterName: 'Test Center'
        });
        await testOwner.save();

        // Create test subject
        testSubject = new Subject({
            name: 'Mathematics',
            code: 'MATH101',
            color: '#4CAF50',
            testCenterOwner: testOwner._id,
            createdBy: testOwner._id,
            isActive: true
        });
        await testSubject.save();

        // Create test questions
        testQuestions = [];
        for (let i = 1; i <= 5; i++) {
            const question = new Question({
                questionText: `What is ${i} + ${i}?`,
                type: 'multiple_choice',
                subject: testSubject._id,
                testCenterOwner: testOwner._id,
                createdBy: testOwner._id,
                difficulty: 'easy',
                points: 10,
                answers: [
                    { id: 'A', text: `${i + i}`, isCorrect: true },
                    { id: 'B', text: `${i + i + 1}`, isCorrect: false },
                    { id: 'C', text: `${i + i - 1}`, isCorrect: false },
                    { id: 'D', text: `${i + i + 2}`, isCorrect: false }
                ],
                isActive: true
            });
            await question.save();
            testQuestions.push(question);
        }

        // Create test
        testTest = new Test({
            title: 'TestSession Demo Test',
            description: 'A test to demonstrate TestSession functionality',
            subject: testSubject._id,
            testCenterOwner: testOwner._id,
            createdBy: testOwner._id,
            duration: 30,
            totalQuestions: 5,
            questionSelectionMethod: 'manual',
            questions: testQuestions.map(q => q._id),
            passingScore: 60,
            status: 'published',
            schedule: {
                startDate: new Date('2025-01-01'),
                endDate: new Date('2025-12-31')
            }
        });
        await testTest.save();
    });

    afterEach(async () => {
        // Clean up after each test
        await Promise.all([
            TestSession.deleteMany({}),
            Test.deleteMany({}),
            Question.deleteMany({}),
            Subject.deleteMany({}),
            User.deleteMany({})
        ]);
    });

    describe('TestSession Creation', () => {
        it('should create a new test session', async () => {
            const session = await testSessionService.createSession(
                testTest._id,
                testUser._id
            );

            expect(session).toBeDefined();
            expect(session.test.toString()).toBe(testTest._id.toString());
            expect(session.student.toString()).toBe(testUser._id.toString());
            expect(session.status).toBe('in_progress');
            expect(session.questions).toHaveLength(5);
            expect(session.answers).toHaveLength(0);
            expect(session.startTime).toBeDefined();
            expect(session.endTime).toBeDefined();
        });

        it('should populate test and student information', async () => {
            const session = await testSessionService.createSession(
                testTest._id,
                testUser._id
            );

            const populatedSession = await TestSession.findById(session._id)
                .populate('test', 'title duration')
                .populate('student', 'firstName lastName email');

            expect(populatedSession.test.title).toBe('TestSession Demo Test');
            expect(populatedSession.student.firstName).toBe('Test');
            expect(populatedSession.student.lastName).toBe('User');
        });

        it('should calculate correct end time based on test duration', async () => {
            const session = await testSessionService.createSession(
                testTest._id,
                testUser._id
            );

            const expectedEndTime = new Date(session.startTime.getTime() + (30 * 60 * 1000)); // 30 minutes
            expect(session.endTime.getTime()).toBeCloseTo(expectedEndTime.getTime(), -2); // Within 100ms
        });

        it('should prevent duplicate active sessions for same test and student', async () => {
            // Create first session
            await testSessionService.createSession(testTest._id, testUser._id);

            // Try to create second session - should throw error
            await expect(
                testSessionService.createSession(testTest._id, testUser._id)
            ).rejects.toThrow('Active session already exists');
        });
    });

    describe('Answer Submission', () => {
        beforeEach(async () => {
            testSession = await testSessionService.createSession(
                testTest._id,
                testUser._id
            );
        });

        it('should submit a correct answer', async () => {
            const questionId = testQuestions[0]._id;
            const correctAnswer = testQuestions[0].answers.find(a => a.isCorrect);

            const result = await testSessionService.submitAnswer(
                testSession._id,
                questionId,
                correctAnswer.id // Use A, B, C, D identifier
            );

            expect(result.success).toBe(true);
            expect(result.isCorrect).toBe(true);
            expect(result.points).toBe(10);

            // Verify answer was saved
            const updatedSession = await TestSession.findById(testSession._id);
            expect(updatedSession.answers).toHaveLength(1);
            expect(updatedSession.answers[0].question.toString()).toBe(questionId.toString());
            expect(updatedSession.answers[0].isCorrect).toBe(true);
            expect(updatedSession.answers[0].points).toBe(10);
        });

        it('should submit an incorrect answer', async () => {
            const questionId = testQuestions[0]._id;
            const incorrectAnswer = testQuestions[0].answers.find(a => !a.isCorrect);

            const result = await testSessionService.submitAnswer(
                testSession._id,
                questionId,
                incorrectAnswer.id // Use A, B, C, D identifier
            );

            expect(result.success).toBe(true);
            expect(result.isCorrect).toBe(false);
            expect(result.points).toBe(0);

            // Verify answer was saved
            const updatedSession = await TestSession.findById(testSession._id);
            expect(updatedSession.answers).toHaveLength(1);
            expect(updatedSession.answers[0].isCorrect).toBe(false);
            expect(updatedSession.answers[0].points).toBe(0);
        });

        it('should update existing answer for same question', async () => {
            const questionId = testQuestions[0]._id;
            const incorrectAnswer = testQuestions[0].answers.find(a => !a.isCorrect);
            const correctAnswer = testQuestions[0].answers.find(a => a.isCorrect);

            // Submit incorrect answer first
            await testSessionService.submitAnswer(
                testSession._id,
                questionId,
                incorrectAnswer.id
            );

            // Update with correct answer
            const result = await testSessionService.submitAnswer(
                testSession._id,
                questionId,
                correctAnswer.id
            );

            expect(result.success).toBe(true);
            expect(result.isCorrect).toBe(true);

            // Verify only one answer exists and it's correct
            const updatedSession = await TestSession.findById(testSession._id);
            expect(updatedSession.answers).toHaveLength(1);
            expect(updatedSession.answers[0].isCorrect).toBe(true);
        });

        it('should reject answer for invalid question', async () => {
            const invalidQuestionId = new mongoose.Types.ObjectId();
            const answerId = testQuestions[0].answers[0]._id;

            await expect(
                testSessionService.submitAnswer(
                    testSession._id,
                    invalidQuestionId,
                    answerId
                )
            ).rejects.toThrow('Question not found in test session');
        });

        it('should reject answer submission for completed session', async () => {
            // Complete the session first
            await testSessionService.completeSession(testSession._id);

            const questionId = testQuestions[0]._id;
            const answerId = testQuestions[0].answers[0]._id;

            await expect(
                testSessionService.submitAnswer(
                    testSession._id,
                    questionId,
                    answerId
                )
            ).rejects.toThrow('Session is not active');
        });
    });

    describe('Session Completion', () => {
        beforeEach(async () => {
            testSession = await testSessionService.createSession(
                testTest._id,
                testUser._id
            );
        });

        it('should complete session and calculate score', async () => {
            // Submit answers to 3 out of 5 questions (2 correct, 1 incorrect)
            const correctAnswers = [
                { questionId: testQuestions[0]._id, answerId: testQuestions[0].answers.find(a => a.isCorrect).id },
                { questionId: testQuestions[1]._id, answerId: testQuestions[1].answers.find(a => a.isCorrect).id }
            ];
            const incorrectAnswer = {
                questionId: testQuestions[2]._id,
                answerId: testQuestions[2].answers.find(a => !a.isCorrect).id
            };            // Submit answers
            for (const answer of correctAnswers) {
                await testSessionService.submitAnswer(
                    testSession._id,
                    answer.questionId,
                    answer.answerId
                );
            }
            await testSessionService.submitAnswer(
                testSession._id,
                incorrectAnswer.questionId,
                incorrectAnswer.answerId
            );

            // Complete session
            const result = await testSessionService.completeSession(testSession._id);

            expect(result.status).toBe('completed');
            expect(result.totalQuestions).toBe(5);
            expect(result.answeredQuestions).toBe(3);
            expect(result.correctAnswers).toBe(2);
            expect(result.totalPoints).toBe(20); // 2 correct × 10 points
            expect(result.maxPoints).toBe(50); // 5 questions × 10 points
            expect(result.score).toBe(40); // (20/50) × 100
            expect(result.passed).toBe(false); // 40% < 60% passing score
            expect(result.completedAt).toBeDefined();
        });

        it('should handle session with all correct answers', async () => {
            // Submit all correct answers
            for (let i = 0; i < testQuestions.length; i++) {
                const correctAnswer = testQuestions[i].answers.find(a => a.isCorrect);
                await testSessionService.submitAnswer(
                    testSession._id,
                    testQuestions[i]._id,
                    correctAnswer._id
                );
            }

            const result = await testSessionService.completeSession(testSession._id);

            expect(result.correctAnswers).toBe(5);
            expect(result.totalPoints).toBe(50);
            expect(result.score).toBe(100);
            expect(result.passed).toBe(true);
        });

        it('should handle session with no answers', async () => {
            const result = await testSessionService.completeSession(testSession._id);

            expect(result.answeredQuestions).toBe(0);
            expect(result.correctAnswers).toBe(0);
            expect(result.totalPoints).toBe(0);
            expect(result.score).toBe(0);
            expect(result.passed).toBe(false);
        });

        it('should update test statistics after completion', async () => {
            // Submit some answers
            const correctAnswer = testQuestions[0].answers.find(a => a.isCorrect);
            await testSessionService.submitAnswer(
                testSession._id,
                testQuestions[0]._id,
                correctAnswer._id
            );

            // Complete session
            await testSessionService.completeSession(testSession._id);

            // Check test stats
            const updatedTest = await Test.findById(testTest._id);
            expect(updatedTest.stats.totalAttempts).toBe(1);
            expect(updatedTest.stats.completedAttempts).toBe(1);
            expect(updatedTest.stats.averageScore).toBe(20); // 1 correct out of 5 = 20%
        });
    });

    describe('Session Management', () => {
        beforeEach(async () => {
            testSession = await testSessionService.createSession(
                testTest._id,
                testUser._id
            );
        });

        it('should get session details', async () => {
            const session = await testSessionService.getSession(testSession._id);

            expect(session).toBeDefined();
            expect(session._id.toString()).toBe(testSession._id.toString());
            expect(session.test).toBeDefined();
            expect(session.student).toBeDefined();
            expect(session.questions).toHaveLength(5);
        });

        it('should abandon session', async () => {
            const result = await testSessionService.abandonSession(testSession._id);

            expect(result.status).toBe('abandoned');
            expect(result.abandonedAt).toBeDefined();

            // Verify session was updated
            const updatedSession = await TestSession.findById(testSession._id);
            expect(updatedSession.status).toBe('abandoned');
        });

        it('should extend session time', async () => {
            const originalEndTime = testSession.endTime;
            const extensionMinutes = 10;

            const result = await testSessionService.extendSession(
                testSession._id,
                extensionMinutes
            );

            expect(result.endTime.getTime()).toBe(
                originalEndTime.getTime() + (extensionMinutes * 60 * 1000)
            );
        });

        it('should check if session is expired', async () => {
            // Create a session that should be expired
            const expiredSession = new TestSession({
                test: testTest._id,
                student: testUser._id,
                questions: testQuestions.map(q => q._id),
                startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
                status: 'in_progress'
            });
            await expiredSession.save();

            const isExpired = expiredSession.isExpired;
            expect(isExpired).toBe(true);
        });
    });

    describe('Analytics and Reporting', () => {
        beforeEach(async () => {
            // Create multiple test sessions with different outcomes
            const sessions = [];

            for (let i = 0; i < 3; i++) {
                const user = new User({
                    firstName: `Student${i}`,
                    lastName: 'Test',
                    email: `student${i}@test.com`,
                    password: 'testpass123',
                    role: 'student',
                    studentRegNumber: `TEST202500${i + 2}`
                });
                await user.save();

                const session = await testSessionService.createSession(
                    testTest._id,
                    user._id
                );

                // Submit different numbers of correct answers
                for (let j = 0; j < i + 1; j++) {
                    const correctAnswer = testQuestions[j].answers.find(a => a.isCorrect);
                    await testSessionService.submitAnswer(
                        session._id,
                        testQuestions[j]._id,
                        correctAnswer._id
                    );
                }

                await testSessionService.completeSession(session._id);
                sessions.push(session);
            }
        });

        it('should generate test analytics', async () => {
            const analytics = await testSessionService.getTestAnalytics(testTest._id);

            expect(analytics.totalSessions).toBe(3);
            expect(analytics.completedSessions).toBe(3);
            expect(analytics.averageScore).toBeGreaterThan(0);
            expect(analytics.passRate).toBeDefined();
            expect(analytics.questionAnalysis).toHaveLength(5);
        });

        it('should analyze question performance', async () => {
            const analytics = await testSessionService.getTestAnalytics(testTest._id);

            // First question should have been answered by all 3 students
            const firstQuestionAnalysis = analytics.questionAnalysis.find(
                qa => qa.question.toString() === testQuestions[0]._id.toString()
            );

            expect(firstQuestionAnalysis.totalAttempts).toBe(3);
            expect(firstQuestionAnalysis.correctAttempts).toBe(3);
            expect(firstQuestionAnalysis.difficultyRating).toBe('easy');
        });

        it('should get student session history', async () => {
            // Create another user and session
            const student = new User({
                firstName: 'History',
                lastName: 'Student',
                email: 'history@test.com',
                password: 'testpass123',
                role: 'student',
                studentRegNumber: 'HIST2025001'
            });
            await student.save();

            const session = await testSessionService.createSession(
                testTest._id,
                student._id
            );
            await testSessionService.completeSession(session._id);

            const history = await testSessionService.getStudentHistory(student._id);

            expect(history).toHaveLength(1);
            expect(history[0].test).toBeDefined();
            expect(history[0].status).toBe('completed');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle invalid session ID', async () => {
            const invalidSessionId = new mongoose.Types.ObjectId();

            await expect(
                testSessionService.getSession(invalidSessionId)
            ).rejects.toThrow('Session not found');
        });

        it('should handle test not found', async () => {
            const invalidTestId = new mongoose.Types.ObjectId();

            await expect(
                testSessionService.createSession(invalidTestId, testUser._id)
            ).rejects.toThrow('Test not found');
        });

        it('should handle inactive test', async () => {
            // Set test to inactive
            testTest.status = 'archived';
            await testTest.save();

            await expect(
                testSessionService.createSession(testTest._id, testUser._id)
            ).rejects.toThrow('Test is not available for taking');
        });

        it('should handle session time expiry gracefully', async () => {
            // Create session with very short duration
            const shortTest = new Test({
                ...testTest.toObject(),
                _id: new mongoose.Types.ObjectId(),
                title: 'Short Test',
                duration: 0.01 // 0.6 seconds
            });
            await shortTest.save();

            const session = await testSessionService.createSession(
                shortTest._id,
                testUser._id
            );

            // Wait for expiry
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Try to submit answer after expiry
            const questionId = testQuestions[0]._id;
            const answerId = testQuestions[0].answers[0]._id;

            await expect(
                testSessionService.submitAnswer(session._id, questionId, answerId)
            ).rejects.toThrow('Session has expired');
        });
    });
});
