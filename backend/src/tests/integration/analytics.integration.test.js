import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { analyticsService } from '../../modules/analytics/service.js';
import { TestSession, Test, User, Subject } from '../../models/index.js';

describe('Analytics Service Integration Tests (Docker)', () => {
    let testUser, testCenter, testDoc;

    beforeAll(async () => {
        // Wait for MongoDB container to be ready
        await waitForMongoDB();

        // Connect to test database in Docker
        const mongoUri = process.env.MONGODB_URI || 'mongodb://cbt_test_user:cbt_test_password@localhost:27019/cbt_test';
        await mongoose.connect(mongoUri);

        console.log('Connected to test database in Docker');
    });

    afterAll(async () => {
        // Clean up and disconnect
        try {
            await mongoose.connection.dropDatabase();
            await mongoose.connection.close();
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    });

    beforeEach(async () => {
        // Clean all collections before each test
        await cleanTestDatabase();
        await seedTestData();
    });

    async function waitForMongoDB() {
        const maxRetries = 30;
        const retryDelay = 2000;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const mongoUri = process.env.MONGODB_URI || 'mongodb://cbt_test_user:cbt_test_password@localhost:27019/cbt_test';
                await mongoose.connect(mongoUri);
                await mongoose.connection.close();
                console.log('MongoDB is ready');
                return;
            } catch (error) {
                console.log(`Waiting for MongoDB... attempt ${i + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        throw new Error('MongoDB failed to start within timeout');
    }

    async function cleanTestDatabase() {
        try {
            const collections = await mongoose.connection.db.collections();
            for (const collection of collections) {
                await collection.deleteMany({});
            }
        } catch (error) {
            console.warn('Error cleaning database:', error);
        }
    }

    async function seedTestData() {
        // Create test center owner
        testCenter = await User.create({
            firstName: 'Test',
            lastName: 'Center',
            email: 'center@test.com',
            password: 'testpassword123',
            role: 'test_center_owner',
            testCenterName: 'Test Center Integration'
        });

        // Create test students
        const students = await User.insertMany([
            {
                firstName: 'Student',
                lastName: 'One',
                email: 'student1@test.com',
                password: 'testpassword123',
                role: 'student',
                studentRegNumber: 'STU001'
            },
            {
                firstName: 'Student',
                lastName: 'Two',
                email: 'student2@test.com',
                password: 'testpassword123',
                role: 'student',
                studentRegNumber: 'STU002'
            },
            {
                firstName: 'Student',
                lastName: 'Three',
                email: 'student3@test.com',
                password: 'testpassword123',
                role: 'student',
                studentRegNumber: 'STU003'
            }
        ]);

        // Create test subject
        const subject = await Subject.create({
            name: 'Mathematics',
            code: 'MATH101',
            description: 'Basic Mathematics for testing',
            testCenterOwner: testCenter._id,
            createdBy: testCenter._id
        });

        // Create test
        testDoc = await Test.create({
            title: 'Docker Integration Test',
            description: 'Test for analytics in Docker',
            duration: 60,
            totalQuestions: 5,
            passingScore: 60,
            subject: subject._id,
            testCenterOwner: testCenter._id,
            createdBy: testCenter._id,
            schedule: {
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
                endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)    // Tomorrow
            },
            status: 'active'
        });

        // Create varied test sessions for comprehensive testing
        const questionIds = [
            new mongoose.Types.ObjectId(),
            new mongoose.Types.ObjectId(),
            new mongoose.Types.ObjectId()
        ];

        await TestSession.insertMany([
            {
                test: testDoc._id,
                student: students[0]._id,
                testCenterOwner: testCenter._id,
                totalQuestions: 5,
                status: 'completed',
                score: 85,
                isPassed: true,
                duration: 1800,
                answers: [
                    { question: questionIds[0], studentAnswer: 'A', isCorrect: true, timeSpent: 120, points: 10 },
                    { question: questionIds[1], studentAnswer: 'B', isCorrect: true, timeSpent: 90, points: 10 },
                    { question: questionIds[2], studentAnswer: 'C', isCorrect: false, timeSpent: 180, points: 0 }
                ],
                createdAt: new Date('2025-08-20T10:00:00Z')
            },
            {
                test: testDoc._id,
                student: students[1]._id,
                testCenterOwner: testCenter._id,
                totalQuestions: 5,
                status: 'completed',
                score: 45,
                isPassed: false,
                duration: 2400,
                answers: [
                    { question: questionIds[0], studentAnswer: 'B', isCorrect: false, timeSpent: 200, points: 0 },
                    { question: questionIds[1], studentAnswer: 'B', isCorrect: true, timeSpent: 150, points: 10 },
                    { question: questionIds[2], studentAnswer: 'A', isCorrect: false, timeSpent: 220, points: 0 }
                ],
                createdAt: new Date('2025-08-21T14:30:00Z')
            },
            {
                test: testDoc._id,
                student: students[2]._id,
                testCenterOwner: testCenter._id,
                totalQuestions: 5,
                status: 'abandoned',
                score: 0,
                isPassed: false,
                duration: 300,
                answers: [],
                createdAt: new Date('2025-08-22T09:15:00Z')
            }
        ]);
    }

    describe('_getBasicTestStats Integration', () => {
        it('should calculate accurate statistics from real MongoDB data', async () => {
            // Arrange
            const query = { test: testDoc._id };

            // Act
            const result = await analyticsService._getBasicTestStats(query);
            const stats = result[0];

            // Assert - Verify exact calculations
            expect(stats).toBeDefined();
            expect(stats.totalAttempts).toBe(3);
            expect(stats.completedAttempts).toBe(2);
            expect(stats.averageScore).toBeCloseTo(65, 1); // (85 + 45) / 2 = 65
            expect(stats.highestScore).toBe(85);
            expect(stats.lowestScore).toBe(45);
            expect(stats.passRate).toBeCloseTo(0.5, 1); // 1 passed out of 2 completed
            expect(stats.averageDuration).toBeCloseTo(2100, 1); // (1800 + 2400) / 2 = 2100
            expect(stats.abandonmentRate).toBeCloseTo(0.333, 2); // 1 abandoned out of 3 total
        });

        it('should handle date range filtering correctly', async () => {
            // Arrange - Filter to only Aug 21 data
            const query = {
                test: testDoc._id,
                createdAt: {
                    $gte: new Date('2025-08-21T00:00:00Z'),
                    $lte: new Date('2025-08-21T23:59:59Z')
                }
            };

            // Act
            const result = await analyticsService._getBasicTestStats(query);
            const stats = result[0];

            // Assert - Should only include student 2's session
            expect(stats).toBeDefined();
            expect(stats.totalAttempts).toBe(1);
            expect(stats.completedAttempts).toBe(1);
            expect(stats.averageScore).toBe(45);
            expect(stats.highestScore).toBe(45);
            expect(stats.lowestScore).toBe(45);
            expect(stats.passRate).toBe(0); // This session failed
            expect(stats.averageDuration).toBe(2400);
        });

        it('should return empty result for non-existent test', async () => {
            // Arrange
            const query = { test: new mongoose.Types.ObjectId() };

            // Act
            const result = await analyticsService._getBasicTestStats(query);

            // Assert
            expect(result).toHaveLength(0);
        });
    });

    describe('Complete Analytics Workflow Integration', () => {
        it('should provide comprehensive analytics for a test', async () => {
            // Act
            const result = await analyticsService.getTestAnalytics(testDoc._id.toString());

            // Assert comprehensive data structure
            expect(result).toHaveProperty('test');
            expect(result).toHaveProperty('basicStats');
            expect(result).toHaveProperty('questionAnalytics');
            expect(result).toHaveProperty('studentPerformance');
            expect(result).toHaveProperty('timeAnalytics');

            // Verify test info
            expect(result.test.title).toBe('Docker Integration Test');

            // Verify basic stats
            expect(result.basicStats.totalAttempts).toBe(3);
            expect(result.basicStats.completedAttempts).toBe(2);

            // Verify question analytics
            expect(result.questionAnalytics).toHaveLength(3); // 3 unique questions

            // Find hardest question (success rate < 50%)
            const hardQuestions = result.questionAnalytics.filter(q => q.difficulty === 'Hard');
            expect(hardQuestions.length).toBeGreaterThan(0);

            // Verify student performance data
            expect(result.studentPerformance).toHaveLength(2); // Only completed sessions
        });

        it('should handle center performance analytics', async () => {
            // Act
            const result = await analyticsService.getCenterPerformance(testCenter._id.toString());

            // Assert
            expect(result.overallStats).toBeDefined();
            expect(result.overallStats.totalSessions).toBe(3);
            expect(result.overallStats.completedSessions).toBe(2);
            expect(result.overallStats.averageScore).toBeCloseTo(65, 1);
            expect(result.overallStats.totalStudents).toBe(3);
            expect(result.overallStats.totalTests).toBe(1);
        });

        it('should handle student performance analytics', async () => {
            // Get the first student
            const student = await User.findOne({ email: 'student1@test.com' });

            // Act
            const result = await analyticsService.getStudentPerformance(
                student._id.toString(),
                testCenter._id.toString()
            );

            // Assert
            expect(result.overallStats).toBeDefined();
            expect(result.overallStats.totalAttempts).toBe(1);
            expect(result.overallStats.averageScore).toBe(85);
            expect(result.overallStats.highestScore).toBe(85);
            expect(result.overallStats.passRate).toBe(100); // 1 passed out of 1
        });
    });

    describe('Edge Cases and Error Scenarios', () => {
        it('should handle empty data gracefully', async () => {
            // Create test subject first
            const emptySubject = await Subject.create({
                name: 'Empty Subject',
                code: 'EMPTY101',
                description: 'Empty subject for testing',
                testCenterOwner: testCenter._id,
                createdBy: testCenter._id
            });

            // Create empty test with all required fields
            const emptyTest = await Test.create({
                title: 'Empty Test',
                description: 'Test with no sessions',
                duration: 60,
                totalQuestions: 1, // Must be at least 1
                passingScore: 50,
                subject: emptySubject._id,
                testCenterOwner: testCenter._id,
                createdBy: testCenter._id,
                schedule: {
                    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
                },
                status: 'active'
            });

            // Act
            const result = await analyticsService.getTestAnalytics(emptyTest._id.toString());

            // Assert
            expect(result.basicStats).toEqual(analyticsService._getEmptyBasicStats());
            expect(result.questionAnalytics).toEqual([]);
        });

        it('should handle invalid test ID', async () => {
            // Act & Assert
            await expect(
                analyticsService.getTestAnalytics('invalid-object-id')
            ).rejects.toThrow();
        });

        it('should handle sessions with no answers', async () => {
            // Create session without answers
            await TestSession.create({
                test: testDoc._id,
                student: testCenter._id, // Using center as student for simplicity
                testCenterOwner: testCenter._id,
                status: 'completed',
                score: 0,
                isPassed: false,
                totalQuestions: 5,
                answers: [], // Empty answers
                duration: 600,
                createdAt: new Date()
            });

            // Act
            const result = await analyticsService.getTestAnalytics(testDoc._id.toString());

            // Assert - Should not break
            expect(result.basicStats.totalAttempts).toBe(4); // 3 original + 1 new
        });
    });

    describe('Performance Tests in Docker', () => {
        it('should handle moderate dataset efficiently', async () => {
            // Arrange - Create moderate dataset
            await createModerateDataset();

            const startTime = Date.now();

            // Act
            const result = await analyticsService.getTestAnalytics(testDoc._id.toString());

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            // Assert
            expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds in Docker
            expect(result.basicStats.totalAttempts).toBeGreaterThan(20);
            expect(result.questionAnalytics.length).toBeGreaterThan(0);
        });

        async function createModerateDataset() {
            const students = [];
            for (let i = 0; i < 20; i++) {
                students.push({
                    firstName: `DockerStudent${i}`,
                    lastName: 'Test',
                    email: `dockerstudent${i}@test.com`,
                    password: 'testpassword123',
                    role: 'student',
                    studentRegNumber: `DOCK${String(i).padStart(3, '0')}`
                });
            }
            const createdStudents = await User.insertMany(students);

            const questionIds = Array.from({ length: 10 }, () => new mongoose.Types.ObjectId());

            const sessions = createdStudents.map((student, index) => ({
                test: testDoc._id,
                student: student._id,
                testCenterOwner: testCenter._id,
                status: Math.random() > 0.1 ? 'completed' : 'abandoned',
                score: Math.floor(Math.random() * 100),
                isPassed: Math.random() > 0.3,
                totalQuestions: 5,
                duration: Math.floor(Math.random() * 3600) + 600,
                answers: questionIds.slice(0, 5).map(qId => ({
                    question: qId,
                    isCorrect: Math.random() > 0.4,
                    timeSpent: Math.floor(Math.random() * 300) + 30,
                    points: Math.random() > 0.4 ? 10 : 0,
                    studentAnswer: Math.random() > 0.5 ? 'A' : 'B'
                })),
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
            }));

            await TestSession.insertMany(sessions);
        }
    });
});
