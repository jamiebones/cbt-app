import { TestEnrollment, Test, User, Subject, Question } from '../../models/index.js';
import { logger } from '../../config/logger.js';
import mongoose from 'mongoose';

class SyncService {
    /**
//... existing code...
     * @returns {Object} Package with students, tests, and metadata
     */
    async createDownloadPackage(testCenterId, testId) {
        try {
            // Get all enrollments for the specific test and test center
            const enrollments = await TestEnrollment.find({
                test: testId,
                testCenterOwner: new mongoose.Types.ObjectId(testCenterId),
                syncStatus: 'registered'
            }).populate([
                { path: 'student', select: 'firstName lastName email studentId' },
                { path: 'test', select: 'title duration instructions' }
            ]);

            // Filter for valid enrollments that have student and test populated correctly
            const validEnrollments = enrollments.filter(e => e.student && e.test);

            if (validEnrollments.length === 0) {
                // Log if there were enrollments but they were invalid
                if (enrollments.length > 0) {
                    logger.warn(`Skipping ${enrollments.length - validEnrollments.length} enrollments due to missing student or test references.`);
                }
                return {
                    packageId: null,
                    message: 'No valid, complete registrations found for the specified test.',
                    data: null
                };
            }

            // Get unique user IDs from valid enrollments
            const userIds = [...new Set(validEnrollments.map(e => e.student._id.toString()))];

            // Fetch complete test data with questions and user details in parallel
            const [testData, users] = await Promise.all([
                this.getSingleTestWithQuestions(testId),
                this.getUserDetails(userIds)
            ]);

            if (!testData) {
                throw new Error(`Test with ID ${testId} not found`);
            }

            // Create package ID for single test
            const packageId = `${testCenterId}_${testId}_${Date.now()}`;

            // Update enrollment sync status for valid enrollments only
            await TestEnrollment.updateMany(
                { _id: { $in: validEnrollments.map(e => e._id) } },
                {
                    syncStatus: 'downloaded',
                    'syncMetadata.packageId': packageId,
                    'syncMetadata.downloadedAt': new Date()
                }
            );

            const packageData = {
                packageId,
                testCenterId,
                testId,
                testTitle: testData.title,
                generatedAt: new Date(),
                enrollments: validEnrollments.map(e => ({
                    id: e._id,
                    userId: e.student._id,
                    testId: e.test._id,
                    accessCode: e.accessCode,
                    scheduledTime: e.scheduledTime
                })),
                users,
                test: testData, // Single test object
                metadata: {
                    totalEnrollments: validEnrollments.length,
                    totalUsers: users.length,
                    totalQuestions: testData.questions.length,
                    downloadFormat: 'json',
                    offlineDbSetup: {
                        singleTest: true,
                        testId: testId,
                        testTitle: testData.title
                    }
                }
            };

            logger.info(`Created download package ${packageId} for test "${testData.title}" with ${validEnrollments.length} enrollments, ${users.length} users`);

            return {
                packageId,
                message: `Package created for test "${testData.title}" with ${validEnrollments.length} student registrations`,
                data: packageData,
                instructions: {
                    step1: "Download this JSON package for the specific test",
                    step2: "Import data into offline database using provided scripts",
                    step3: "Students take the test offline using local application",
                    step4: "Upload results back using upload-results endpoint"
                }
            };

        } catch (error) {
            logger.error('Error creating download package:', error);
            throw new Error(`Failed to create download package: ${error.message}`);
        }
    }

    /**
     * Get a single test with its questions
     * @param {string} testId - Test ID
     * @returns {Object} Test with populated questions
     */
    async getSingleTestWithQuestions(testId) {
        const test = await Test.findById(testId)
            .populate({
                path: 'subject',
                select: 'name description'
            })
            .lean();

        if (!test) {
            return null;
        }

        // Get questions for this test (questions reference the test, not the other way around)
        const questions = await Question.find({ test: testId })
            .select('question options correctAnswer explanation difficulty points')
            .lean();

        return {
            ...test,
            questions
        };
    }

    /**
     * Get user details for enrolled students
     * @param {Array} userIds - Array of user IDs
     * @returns {Array} User details
     */
    async getUserDetails(userIds) {
        return await User.find({ _id: { $in: userIds } })
            .select('firstName lastName email studentId profilePicture')
            .lean();
    }
}

const syncService = new SyncService();
export { syncService };