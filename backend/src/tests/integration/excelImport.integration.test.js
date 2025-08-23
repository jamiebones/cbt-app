import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import * as XLSX from 'xlsx';
import { questionBankService } from '../../../src/modules/questions/service.js';
import { excelQuestionService } from '../../../src/modules/questions/excelService.js';
import { User, Subject, Question } from '../../../src/models/index.js';
import mongoose from 'mongoose';

describe('Excel Import Integration Tests', () => {
    let testUser, testSubject, testOwner;

    beforeAll(async () => {
        // Connect to test database if not already connected
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cbt_test');
        }
    });

    afterAll(async () => {
        // Clean up and close connection
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Create test owner
        testOwner = await User.create({
            firstName: 'Test',
            lastName: 'Owner',
            email: 'testowner@example.com',
            password: 'password123',
            role: 'test_center_owner',
            testCenterName: 'Test Learning Center',
            subscriptionTier: 'premium'
        });

        // Create test creator
        testUser = await User.create({
            firstName: 'Test',
            lastName: 'Creator',
            email: 'testcreator@example.com',
            password: 'password123',
            role: 'test_creator',
            testCenterOwner: testOwner._id
        });

        // Create test subject
        testSubject = await Subject.create({
            name: 'Mathematics',
            code: 'MATH101',
            description: 'Basic Mathematics',
            testCenterOwner: testOwner._id,
            createdBy: testUser._id
        });
    });

    afterEach(async () => {
        // Clean up test data
        await Question.deleteMany({});
        await Subject.deleteMany({});
        await User.deleteMany({});
    });

    it('should successfully import questions from Excel file', async () => {
        // Create test Excel data
        const testData = [
            ['Question Text', 'Question Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Points', 'Difficulty', 'Explanation'],
            ['What is 2 + 2?', 'multiple_choice', '3', '4', '5', '6', 'B', '1', 'easy', 'Basic addition'],
            ['What is 3 * 3?', 'multiple_choice', '6', '8', '9', '12', 'C', '2', 'medium', 'Basic multiplication'],
            ['The Earth is flat', 'true_false', '', '', '', '', 'false', '1', 'easy', 'Earth is spherical']
        ];

        // Create Excel workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(testData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Test the import process
        const result = await questionBankService.importQuestionsFromExcel(
            buffer,
            'MATH101',
            testOwner._id,
            testUser._id
        );

        // Verify import was successful
        expect(result.success).toBe(true);
        expect(result.summary.totalRows).toBe(3);
        expect(result.summary.successCount).toBe(3);
        expect(result.summary.errorCount).toBe(0);

        // Verify questions were created in database
        const importedQuestions = await Question.find({
            testCenterOwner: testOwner._id,
            subject: testSubject._id
        }).populate('subject');

        expect(importedQuestions).toHaveLength(3);

        // Check first question (multiple choice)
        const mcQuestion1 = importedQuestions.find(q => q.questionText === 'What is 2 + 2?');
        expect(mcQuestion1).toBeDefined();
        expect(mcQuestion1.type).toBe('multiple_choice');
        expect(mcQuestion1.answers).toHaveLength(4);
        expect(mcQuestion1.answers.find(a => a.id === 'B').isCorrect).toBe(true);
        expect(mcQuestion1.points).toBe(1);
        expect(mcQuestion1.difficulty).toBe('easy');

        // Check second question (multiple choice)
        const mcQuestion2 = importedQuestions.find(q => q.questionText === 'What is 3 * 3?');
        expect(mcQuestion2).toBeDefined();
        expect(mcQuestion2.type).toBe('multiple_choice');
        expect(mcQuestion2.answers.find(a => a.id === 'C').isCorrect).toBe(true);
        expect(mcQuestion2.points).toBe(2);
        expect(mcQuestion2.difficulty).toBe('medium');

        // Check true/false question
        const tfQuestion = importedQuestions.find(q => q.questionText === 'The Earth is flat');
        expect(tfQuestion).toBeDefined();
        expect(tfQuestion.type).toBe('true_false');
        expect(tfQuestion.correctAnswer).toBe('false');
        expect(tfQuestion.points).toBe(1);
        expect(tfQuestion.difficulty).toBe('easy');
    });

    it('should handle validation errors gracefully', async () => {
        // Create Excel with validation errors
        const testData = [
            ['Question Text', 'Question Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Points', 'Difficulty', 'Explanation'],
            ['', 'multiple_choice', '3', '4', '5', '6', 'B', '1', 'easy', 'Missing question text'],
            ['Valid question?', 'invalid_type', '3', '4', '5', '6', 'B', '1', 'easy', 'Invalid type'],
            ['Another valid question?', 'multiple_choice', '3', '4', '', '', 'C', '1', 'easy', 'Invalid correct answer (no option C)']
        ];

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(testData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        const result = await questionBankService.importQuestionsFromExcel(
            buffer,
            'MATH101',
            testOwner._id,
            testUser._id
        );

        // Should have errors and no valid questions
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.invalidCount).toBeGreaterThan(0);
        expect(result.validCount).toBe(0);

        // Check that invalid questions were not imported
        const importedQuestions = await Question.find({
            testCenterOwner: testOwner._id,
            subject: testSubject._id
        });

        expect(importedQuestions.length).toBeLessThan(3);
    });

    it('should preview Excel import correctly', async () => {
        const testData = [
            ['Question Text', 'Question Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Points', 'Difficulty', 'Explanation'],
            ['What is 2 + 2?', 'multiple_choice', '3', '4', '5', '6', 'B', '1', 'easy', 'Basic addition'],
            ['The Earth is flat', 'true_false', '', '', '', '', 'false', '1', 'easy', 'Earth is spherical']
        ];

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(testData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        const preview = await questionBankService.previewExcelImport(
            buffer,
            'MATH101',
            testOwner._id
        );

        expect(preview.success).toBe(true);
        expect(preview.preview.totalRowsInFile).toBe(2);
        expect(preview.preview.validCount).toBe(2);
        expect(preview.preview.invalidCount).toBe(0);
        expect(preview.sampleQuestions).toHaveLength(2);

        // Verify no questions were actually imported during preview
        const questionsInDB = await Question.find({
            testCenterOwner: testOwner._id,
            subject: testSubject._id
        });
        expect(questionsInDB).toHaveLength(0);
    });

    it('should generate Excel template successfully', async () => {
        const templateBuffer = await questionBankService.generateExcelTemplate(testOwner._id);

        expect(templateBuffer).toBeInstanceOf(Buffer);
        expect(templateBuffer.length).toBeGreaterThan(0);

        // Verify template can be parsed
        const workbook = XLSX.read(templateBuffer, { type: 'buffer' });
        expect(workbook.SheetNames).toContain('Questions');

        const worksheet = workbook.Sheets['Questions'];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Should have header and sample data
        expect(data.length).toBeGreaterThan(1);
        expect(data[0][0]).toBe('Question Text');
        expect(data[0][1]).toBe('Question Type');
    });

    it('should handle subject validation errors', async () => {
        const testData = [
            ['Question Text', 'Question Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Points', 'Difficulty', 'Explanation'],
            ['What is 2 + 2?', 'multiple_choice', '3', '4', '5', '6', 'B', '1', 'easy', 'Basic addition']
        ];

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(testData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Try to import with non-existent subject code - should return error response not throw
        const result = await questionBankService.importQuestionsFromExcel(
            buffer,
            'NONEXISTENT',
            testOwner._id,
            testUser._id
        );

        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].type).toBe('SUBJECT_ERROR');
    });
});
