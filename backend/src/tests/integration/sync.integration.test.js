import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../server.js';
import { connectDatabase, disconnectDatabase } from '../../config/database.js';
import { User, Test, Question, Subject, TestEnrollment } from '../../models/index.js';

const { ObjectId } = mongoose.Types;

describe('Sync Service Integration Tests', () => {
    let testSubject, testQuestions, testData, testStudents, testEnrollments;
    let testCenterId = 'test-center-001';

    beforeAll(async () => {
        // Connect to test database
        await connectDatabase();
    });

    afterAll(async () => {
        // Clean up and disconnect
        await disconnectDatabase();
    });

    beforeEach(async () => {
        // Clear test data
        await TestEnrollment.deleteMany({});
        await Question.deleteMany({});
        await Test.deleteMany({});
        await Subject.deleteMany({});
        await User.deleteMany({});

        // Create test data
        await createTestData();
    });

    afterEach(async () => {
        // Clean up after each test
        await TestEnrollment.deleteMany({});
        await Question.deleteMany({});
        await Test.deleteMany({});
        await Subject.deleteMany({});
        await User.deleteMany({});
    });

    async function createTestData() {
        // Create test subject
        testSubject = await Subject.create({
            name: 'Mathematics for Sync Testing',
            description: 'Test subject for sync functionality',
            isActive: true,
            createdBy: new ObjectId(),
            tags: ['sync-test', 'mathematics']
        });

        // Create test questions
        testQuestions = [];
        for (let i = 1; i <= 5; i++) {
            const question = await Question.create({
                question: `What is ${i} + ${i}?`,
                options: [`${i + i - 1}`, `${i + i}`, `${i + i + 1}`, `${i + i + 2}`],
                correctAnswer: 'B',
                explanation: `${i} + ${i} = ${i + i}`,
                subject: testSubject._id,
                difficulty: 'easy',
                points: 1,
                tags: ['sync-test'],
                isActive: true,
                createdBy: new ObjectId()
            });
            testQuestions.push(question);
        }

        // Create test
        testData = await Test.create({
            title: 'Sync Test - Mathematics',
            description: 'Integration test for sync functionality',
            subject: testSubject._id,
            questions: testQuestions.map(q => q._id),
            duration: 30,
            passingScore: 70,
            instructions: 'Answer all questions. This is a sync integration test.',
            isActive: true,
            createdBy: new ObjectId(),
            settings: {
                shuffleQuestions: false,
                showResults: true,
                allowReview: true,
                timeLimit: 30
            }
        });

        // Create test students
        testStudents = [];
        for (let i = 1; i <= 3; i++) {
            const student = await User.create({
                firstName: `SyncStudent${i}`,
                lastName: 'Test',
                email: `syncstudent${i}@test.com`,
                studentId: `SYNC${String(i).padStart(3, '0')}`,
                role: 'student',
                isActive: true,
                password: 'hashedpassword123'
            });
            testStudents.push(student);
        }

        // Create test enrollments
        testEnrollments = [];
        for (let i = 0; i < testStudents.length; i++) {
            const enrollment = await TestEnrollment.create({
                user: testStudents[i]._id,
                test: testData._id,
                testCenter: testCenterId,
                enrolledAt: new Date(),
                accessCode: `SYNC_TEST_${String(i + 1).padStart(3, '0')}`,
                status: 'enrolled',
                paymentStatus: 'paid',
                scheduledDate: new Date(),
                scheduledTime: `${9 + i}:00`,
                syncStatus: 'registered',
                syncMetadata: {
                    packageId: null,
                    downloadedAt: null,
                    lastModified: new Date()
                },
                completed: false,
                accessCodeUsed: false
            });
            testEnrollments.push(enrollment);
        }
    }

    describe('GET /api/sync/status/:testCenterId', () => {
        it('should return sync status for test center', async () => {
            const fromDate = '2025-08-01';
            const toDate = '2025-08-31';

            const response = await request(app)
                .get(`/api/sync/status/${testCenterId}?from=${fromDate}&to=${toDate}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('testCenterId', testCenterId);
            expect(response.body.data).toHaveProperty('period');
            expect(response.body.data).toHaveProperty('summary');
            expect(response.body.data).toHaveProperty('recentPackages');
        });

        it('should return 400 for missing test center ID', async () => {
            const response = await request(app)
                .get('/api/sync/status/')
                .expect(404); // Route not found without testCenterId
        });
    });

    describe('POST /api/sync/download-users', () => {
        it('should create download package for valid test center and test', async () => {
            const requestData = {
                testCenterId: testCenterId,
                testId: testData._id.toString()
            };

            const response = await request(app)
                .post('/api/sync/download-users')
                .send(requestData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('packageId');
            expect(response.body).toHaveProperty('data');

            const { data } = response.body;
            expect(data).toHaveProperty('packageId');
            expect(data).toHaveProperty('testCenterId', testCenterId);
            expect(data).toHaveProperty('testId', testData._id.toString());
            expect(data).toHaveProperty('enrollments');
            expect(data).toHaveProperty('users');
            expect(data).toHaveProperty('test');
            expect(data).toHaveProperty('metadata');

            // Verify enrollments
            expect(data.enrollments).toHaveLength(testStudents.length);
            expect(data.users).toHaveLength(testStudents.length);
            expect(data.test.questions).toHaveLength(testQuestions.length);

            // Verify metadata
            expect(data.metadata).toHaveProperty('totalEnrollments', testStudents.length);
            expect(data.metadata).toHaveProperty('totalUsers', testStudents.length);
            expect(data.metadata).toHaveProperty('totalQuestions', testQuestions.length);
            expect(data.metadata.offlineDbSetup).toHaveProperty('singleTest', true);
        });

        it('should return 404 when no enrollments found', async () => {
            // Create a test with no enrollments
            const emptyTest = await Test.create({
                title: 'Empty Test',
                description: 'Test with no enrollments',
                subject: testSubject._id,
                questions: [testQuestions[0]._id],
                duration: 30,
                passingScore: 70,
                instructions: 'Empty test',
                isActive: true,
                createdBy: new ObjectId()
            });

            const requestData = {
                testCenterId: testCenterId,
                testId: emptyTest._id.toString()
            };

            const response = await request(app)
                .post('/api/sync/download-users')
                .send(requestData)
                .expect(404);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.message).toContain('No registrations found');
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/sync/download-users')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.message).toContain('Test center ID and test ID are required');
        });

        it('should update enrollment sync status to downloaded', async () => {
            const requestData = {
                testCenterId: testCenterId,
                testId: testData._id.toString()
            };

            await request(app)
                .post('/api/sync/download-users')
                .send(requestData)
                .expect(200);

            // Verify enrollments were updated
            const updatedEnrollments = await TestEnrollment.find({
                test: testData._id,
                testCenter: testCenterId
            });

            expect(updatedEnrollments).toHaveLength(testStudents.length);
            updatedEnrollments.forEach(enrollment => {
                expect(enrollment.syncStatus).toBe('downloaded');
                expect(enrollment.syncMetadata.packageId).toBeDefined();
                expect(enrollment.syncMetadata.downloadedAt).toBeDefined();
            });
        });
    });

    describe('POST /api/sync/export-package', () => {
        let packageData;

        beforeEach(async () => {
            // Create a download package first
            const requestData = {
                testCenterId: testCenterId,
                testId: testData._id.toString()
            };

            const downloadResponse = await request(app)
                .post('/api/sync/download-users')
                .send(requestData)
                .expect(200);

            packageData = downloadResponse.body.data;
        });

        it('should export package in JSON format', async () => {
            const exportRequest = {
                packageData: packageData,
                format: 'json'
            };

            const response = await request(app)
                .post('/api/sync/export-package')
                .send(exportRequest)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('format', 'json');
            expect(response.body).toHaveProperty('files');
            expect(response.body.files).toHaveProperty('package.json');
        });

        it('should export package in mongoexport format', async () => {
            const exportRequest = {
                packageData: packageData,
                format: 'mongoexport'
            };

            const response = await request(app)
                .post('/api/sync/export-package')
                .send(exportRequest)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('format', 'mongoexport');
            expect(response.body).toHaveProperty('files');
            expect(response.body.files).toHaveProperty('users.json');
            expect(response.body.files).toHaveProperty('test.json');
            expect(response.body.files).toHaveProperty('questions.json');
            expect(response.body.files).toHaveProperty('testenrollments.json');
            expect(response.body.files).toHaveProperty('import-script.sh');
        });

        it('should export package in mongoimport format', async () => {
            const exportRequest = {
                packageData: packageData,
                format: 'mongoimport'
            };

            const response = await request(app)
                .post('/api/sync/export-package')
                .send(exportRequest)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('format', 'mongoimport');
            expect(response.body).toHaveProperty('files');
            expect(response.body.files).toHaveProperty('import-data.js');
            expect(response.body.files).toHaveProperty('package-info.json');
        });

        it('should return 400 for missing package data', async () => {
            const response = await request(app)
                .post('/api/sync/export-package')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.message).toContain('Package data is required');
        });
    });

    describe('POST /api/sync/upload-results', () => {
        let packageId, enrollmentIds;

        beforeEach(async () => {
            // Create a download package first
            const requestData = {
                testCenterId: testCenterId,
                testId: testData._id.toString()
            };

            const downloadResponse = await request(app)
                .post('/api/sync/download-users')
                .send(requestData)
                .expect(200);

            packageId = downloadResponse.body.packageId;
            enrollmentIds = downloadResponse.body.data.enrollments.map(e => e.id);
        });

        it('should successfully upload and process test results', async () => {
            const resultsData = {
                packageId: packageId,
                testCenterId: testCenterId,
                results: enrollmentIds.map((enrollmentId, index) => ({
                    enrollmentId: enrollmentId,
                    userId: testStudents[index]._id.toString(),
                    testId: testData._id.toString(),
                    answers: { '1': 'B', '2': 'B', '3': 'B', '4': 'B', '5': 'B' },
                    startTime: '2025-08-25T09:00:00.000Z',
                    endTime: '2025-08-25T09:30:00.000Z',
                    score: 85.0 + index * 5 // Different scores for each student
                }))
            };

            const response = await request(app)
                .post('/api/sync/upload-results')
                .send(resultsData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('packageId', packageId);
            expect(response.body).toHaveProperty('summary');
            expect(response.body.summary).toHaveProperty('total', testStudents.length);
            expect(response.body.summary).toHaveProperty('success', testStudents.length);
            expect(response.body.summary).toHaveProperty('failures', 0);

            // Verify enrollments were updated
            const updatedEnrollments = await TestEnrollment.find({
                _id: { $in: enrollmentIds }
            });

            updatedEnrollments.forEach(enrollment => {
                expect(enrollment.syncStatus).toBe('results_uploaded');
                expect(enrollment.completed).toBe(true);
                expect(enrollment.accessCodeUsed).toBe(true);
                expect(enrollment.syncMetadata.resultsUploadedAt).toBeDefined();
                expect(enrollment.syncMetadata.offlineScore).toBeDefined();
                expect(enrollment.syncMetadata.offlineAnswers).toBeDefined();
            });
        });

        it('should handle invalid package ID', async () => {
            const invalidResultsData = {
                packageId: 'invalid-package-id',
                testCenterId: testCenterId,
                results: [{
                    enrollmentId: enrollmentIds[0],
                    userId: testStudents[0]._id.toString(),
                    testId: testData._id.toString(),
                    answers: { '1': 'B' },
                    startTime: '2025-08-25T09:00:00.000Z',
                    endTime: '2025-08-25T09:30:00.000Z',
                    score: 85.0
                }]
            };

            const response = await request(app)
                .post('/api/sync/upload-results')
                .send(invalidResultsData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.summary.failures).toBeGreaterThan(0);
            expect(response.body.details[0]).toHaveProperty('success', false);
            expect(response.body.details[0].error).toContain('Invalid enrollment or package mismatch');
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/sync/upload-results')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.message).toContain('Package ID and results data are required');
        });

        it('should handle partial failures gracefully', async () => {
            const resultsData = {
                packageId: packageId,
                testCenterId: testCenterId,
                results: [
                    // Valid result
                    {
                        enrollmentId: enrollmentIds[0],
                        userId: testStudents[0]._id.toString(),
                        testId: testData._id.toString(),
                        answers: { '1': 'B', '2': 'B' },
                        startTime: '2025-08-25T09:00:00.000Z',
                        endTime: '2025-08-25T09:30:00.000Z',
                        score: 85.0
                    },
                    // Invalid result (missing required fields)
                    {
                        enrollmentId: enrollmentIds[1],
                        // Missing userId, testId, answers
                        startTime: '2025-08-25T09:00:00.000Z',
                        endTime: '2025-08-25T09:30:00.000Z',
                        score: 90.0
                    }
                ]
            };

            const response = await request(app)
                .post('/api/sync/upload-results')
                .send(resultsData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.summary.total).toBe(2);
            expect(response.body.summary.success).toBe(1);
            expect(response.body.summary.failures).toBe(1);
        });
    });

    describe('PUT /api/sync/status', () => {
        it('should update sync status for enrollments', async () => {
            const enrollmentIds = testEnrollments.map(e => e._id.toString());
            const updateData = {
                enrollmentIds: enrollmentIds,
                status: 'downloaded'
            };

            const response = await request(app)
                .put('/api/sync/status')
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('updated', testEnrollments.length);

            // Verify status was updated
            const updatedEnrollments = await TestEnrollment.find({
                _id: { $in: enrollmentIds }
            });

            updatedEnrollments.forEach(enrollment => {
                expect(enrollment.syncStatus).toBe('downloaded');
            });
        });

        it('should return 400 for invalid status', async () => {
            const updateData = {
                enrollmentIds: [testEnrollments[0]._id.toString()],
                status: 'invalid_status'
            };

            const response = await request(app)
                .put('/api/sync/status')
                .send(updateData)
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.message).toContain('Invalid status');
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .put('/api/sync/status')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.message).toContain('Enrollment IDs array and status are required');
        });
    });

    describe('Complete Sync Workflow Integration', () => {
        it('should handle complete offline testing workflow', async () => {
            // Step 1: Create download package
            const downloadRequest = {
                testCenterId: testCenterId,
                testId: testData._id.toString()
            };

            const downloadResponse = await request(app)
                .post('/api/sync/download-users')
                .send(downloadRequest)
                .expect(200);

            const packageId = downloadResponse.body.packageId;
            const packageData = downloadResponse.body.data;

            // Verify initial state
            expect(packageData.enrollments).toHaveLength(testStudents.length);
            expect(packageData.test.questions).toHaveLength(testQuestions.length);

            // Step 2: Export package for offline use
            const exportRequest = {
                packageData: packageData,
                format: 'mongoexport'
            };

            await request(app)
                .post('/api/sync/export-package')
                .send(exportRequest)
                .expect(200);

            // Step 3: Simulate offline testing and upload results
            const resultsData = {
                packageId: packageId,
                testCenterId: testCenterId,
                results: packageData.enrollments.map((enrollment, index) => ({
                    enrollmentId: enrollment.id,
                    userId: enrollment.userId,
                    testId: enrollment.testId,
                    answers: { '1': 'B', '2': 'B', '3': 'B', '4': 'B', '5': 'B' },
                    startTime: '2025-08-25T09:00:00.000Z',
                    endTime: '2025-08-25T09:30:00.000Z',
                    score: 90.0 + index * 2
                }))
            };

            const uploadResponse = await request(app)
                .post('/api/sync/upload-results')
                .send(resultsData)
                .expect(200);

            expect(uploadResponse.body.summary.success).toBe(testStudents.length);

            // Step 4: Verify final sync status
            const statusResponse = await request(app)
                .get(`/api/sync/status/${testCenterId}?from=2025-08-01&to=2025-08-31`)
                .expect(200);

            expect(statusResponse.body.data.summary.results_uploaded).toBe(testStudents.length);

            // Step 5: Verify all enrollments are completed
            const finalEnrollments = await TestEnrollment.find({
                test: testData._id,
                testCenter: testCenterId
            });

            finalEnrollments.forEach(enrollment => {
                expect(enrollment.syncStatus).toBe('results_uploaded');
                expect(enrollment.completed).toBe(true);
                expect(enrollment.accessCodeUsed).toBe(true);
                expect(enrollment.syncMetadata.offlineScore).toBeDefined();
                expect(enrollment.syncMetadata.offlineAnswers).toBeDefined();
            });
        });
    });
});
