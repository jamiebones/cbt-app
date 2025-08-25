/**
 * Test data generation for Sync Service testing
 * Creates realistic test data for testing the sync functionality
 */

import { User, Test, Question, Subject, TestEnrollment } from '../models/index.js';
import { connectDatabase } from '../config/database.js';
import mongoose from 'mongoose';

class SyncTestDataGenerator {
    /**
     * Create complete test data for sync testing
     */
    async createTestData() {
        try {
            await this.clearExistingTestData();

            // Create test subject
            const subject = await this.createTestSubject();

            // Create test questions
            const questions = await this.createTestQuestions(subject._id);

            // Create test
            const test = await this.createTest(subject._id, questions.map(q => q._id));

            // Create students (users)
            const students = await this.createTestStudents();

            // Create test enrollments
            const enrollments = await this.createTestEnrollments(test._id, students, 'test-center-001');

            console.log('✅ Test data created successfully:');
            console.log(`   📚 Subject: ${subject.name}`);
            console.log(`   📝 Test: ${test.title} (${questions.length} questions)`);
            console.log(`   👥 Students: ${students.length}`);
            console.log(`   📋 Enrollments: ${enrollments.length}`);
            console.log(`   🏢 Test Center: test-center-001`);

            return {
                subject,
                test,
                questions,
                students,
                enrollments,
                testCenterId: 'test-center-001'
            };

        } catch (error) {
            console.error('❌ Error creating test data:', error);
            throw error;
        }
    }

    /**
     * Clear existing test data
     */
    async clearExistingTestData() {
        await TestEnrollment.deleteMany({ accessCode: { $regex: '^TEST_' } });
        await Question.deleteMany({ question: { $regex: '^Test Question' } });
        await Test.deleteMany({ title: { $regex: '^Test.*Sync' } });
        await Subject.deleteMany({ name: { $regex: '^Test Subject' } });
        await User.deleteMany({ email: { $regex: '@synctest.com$' } });
        console.log('🧹 Cleared existing test data');
    }

    /**
     * Create a test subject
     */
    async createTestSubject() {
        const subject = new Subject({
            name: 'Test Subject for Sync',
            description: 'A test subject created for sync functionality testing',
            isActive: true,
            createdBy: new mongoose.Types.ObjectId(),
            tags: ['sync-test', 'mathematics']
        });

        return await subject.save();
    }

    /**
     * Create test questions
     */
    async createTestQuestions(subjectId) {
        const questions = [];

        for (let i = 1; i <= 10; i++) {
            const question = new Question({
                question: `Test Question ${i}: What is ${i} + ${i}?`,
                options: [
                    `${i + i - 1}`,
                    `${i + i}`,
                    `${i + i + 1}`,
                    `${i + i + 2}`
                ],
                correctAnswer: 'B', // Second option is correct
                explanation: `${i} + ${i} = ${i + i}`,
                subject: subjectId,
                difficulty: i <= 3 ? 'easy' : i <= 7 ? 'medium' : 'hard',
                points: i <= 3 ? 1 : i <= 7 ? 2 : 3,
                tags: ['sync-test', 'arithmetic'],
                isActive: true,
                createdBy: new mongoose.Types.ObjectId()
            });

            questions.push(await question.save());
        }

        return questions;
    }

    /**
     * Create a test
     */
    async createTest(subjectId, questionIds) {
        const test = new Test({
            title: 'Mathematics Test for Sync Testing',
            description: 'A comprehensive mathematics test for testing sync functionality',
            subject: subjectId,
            questions: questionIds,
            duration: 60, // 60 minutes
            passingScore: 70,
            instructions: 'Answer all questions carefully. You have 60 minutes to complete this test.',
            isActive: true,
            createdBy: new mongoose.Types.ObjectId(),
            settings: {
                shuffleQuestions: false,
                showResults: true,
                allowReview: true,
                timeLimit: 60
            }
        });

        return await test.save();
    }

    /**
     * Create test students
     */
    async createTestStudents() {
        const students = [];

        for (let i = 1; i <= 5; i++) {
            const student = new User({
                firstName: `Student${i}`,
                lastName: `SyncTest`,
                email: `student${i}@synctest.com`,
                studentId: `ST${String(i).padStart(3, '0')}`,
                role: 'student',
                isActive: true,
                password: 'hashedpassword123', // In real scenario, this would be properly hashed
                profilePicture: null,
                lastLogin: new Date()
            });

            students.push(await student.save());
        }

        return students;
    }

    /**
     * Create test enrollments
     */
    async createTestEnrollments(testId, students, testCenterId) {
        const enrollments = [];

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const enrollment = new TestEnrollment({
                user: student._id,
                test: testId,
                testCenter: testCenterId,
                enrolledAt: new Date(),
                accessCode: `TEST_${String(i + 1).padStart(3, '0')}_${Date.now()}`,
                status: 'enrolled',
                paymentStatus: 'paid',
                scheduledDate: new Date(),
                scheduledTime: `${9 + i}:00`, // 9:00, 10:00, 11:00, etc.
                syncStatus: 'registered', // Ready for sync
                syncMetadata: {
                    packageId: null,
                    downloadedAt: null,
                    lastModified: new Date()
                },
                completed: false,
                accessCodeUsed: false
            });

            enrollments.push(await enrollment.save());
        }

        return enrollments;
    }

    /**
     * Get test data summary
     */
    async getTestDataSummary() {
        const counts = await Promise.all([
            Subject.countDocuments({ name: { $regex: '^Test Subject' } }),
            Test.countDocuments({ title: { $regex: '^.*Test.*Sync' } }),
            Question.countDocuments({ question: { $regex: '^Test Question' } }),
            User.countDocuments({ email: { $regex: '@synctest.com$' } }),
            TestEnrollment.countDocuments({ accessCode: { $regex: '^TEST_' } })
        ]);

        return {
            subjects: counts[0],
            tests: counts[1],
            questions: counts[2],
            students: counts[3],
            enrollments: counts[4]
        };
    }
}

// Export for use in tests
export { SyncTestDataGenerator };

// CLI usage for manual testing
if (process.argv[1] === new URL(import.meta.url).pathname) {
    (async () => {
        try {
            await connectDatabase();
            const generator = new SyncTestDataGenerator();

            if (process.argv[2] === 'create') {
                await generator.createTestData();
            } else if (process.argv[2] === 'summary') {
                const summary = await generator.getTestDataSummary();
                console.log('📊 Test Data Summary:', summary);
            } else if (process.argv[2] === 'clear') {
                await generator.clearExistingTestData();
                console.log('🧹 Test data cleared');
            } else {
                console.log('Usage:');
                console.log('  node sync-test-data.js create   - Create test data');
                console.log('  node sync-test-data.js summary  - Show test data summary');
                console.log('  node sync-test-data.js clear    - Clear test data');
            }

            process.exit(0);
        } catch (error) {
            console.error('Error:', error);
            process.exit(1);
        }
    })();
}
