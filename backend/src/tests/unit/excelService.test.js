import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { excelQuestionService } from '../../../src/modules/questions/excelService.js';
import * as XLSX from 'xlsx';

describe('Excel Question Service', () => {
    describe('parseExcelFile', () => {
        it('should parse a valid Excel file with question data', async () => {
            // Create test Excel data
            const testData = [
                ['Question Text', 'Question Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Points', 'Difficulty', 'Explanation'],
                ['What is 2 + 2?', 'multiple_choice', '3', '4', '5', '6', 'B', '1', 'easy', 'Basic addition'],
                ['The Earth is flat', 'true_false', '', '', '', '', 'false', '2', 'easy', 'Earth is spherical']
            ];

            // Create Excel workbook
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(testData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

            // Convert to buffer
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            // Test parsing
            const result = await excelQuestionService.parseExcelFile(buffer);

            expect(result).toBeDefined();
            expect(result.totalRows).toBe(2);
            expect(result.questions).toHaveLength(2);

            // Check first question (multiple choice)
            const mcQuestion = result.questions[0];
            expect(mcQuestion.questionText).toBe('What is 2 + 2?');
            expect(mcQuestion.type).toBe('multiple_choice');
            expect(mcQuestion.answers).toHaveLength(4);
            expect(mcQuestion.correctAnswer).toBe('B');
            expect(mcQuestion.points).toBe(1);
            expect(mcQuestion.difficulty).toBe('easy');

            // Check second question (true/false)
            const tfQuestion = result.questions[1];
            expect(tfQuestion.questionText).toBe('The Earth is flat');
            expect(tfQuestion.type).toBe('true_false');
            expect(tfQuestion.correctAnswer).toBe('false');
            expect(tfQuestion.points).toBe(2);
        });

        it('should handle empty Excel file', async () => {
            // Create empty Excel workbook
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet([]);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            await expect(excelQuestionService.parseExcelFile(buffer))
                .rejects.toThrow('Excel file contains no data rows');
        });

        it('should handle corrupted Excel file', async () => {
            const corruptedBuffer = Buffer.from('not-an-excel-file');

            await expect(excelQuestionService.parseExcelFile(corruptedBuffer))
                .rejects.toThrow();
        });
    });

    describe('validateSingleQuestion', () => {
        it('should validate a correct multiple choice question', () => {
            const question = {
                rowNumber: 2,
                questionText: 'What is 2 + 2?',
                type: 'multiple_choice',
                answers: [
                    { id: 'A', text: '3', isCorrect: false },
                    { id: 'B', text: '4', isCorrect: true },
                    { id: 'C', text: '5', isCorrect: false },
                    { id: 'D', text: '6', isCorrect: false }
                ],
                correctAnswer: 'B',
                points: 1,
                difficulty: 'easy',
                explanation: 'Basic addition'
            };

            const result = excelQuestionService.validateSingleQuestion(question);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate a correct true/false question', () => {
            const question = {
                rowNumber: 2,
                questionText: 'The Earth is flat',
                type: 'true_false',
                correctAnswer: 'false',
                points: 2,
                difficulty: 'easy',
                explanation: 'Earth is spherical'
            };

            const result = excelQuestionService.validateSingleQuestion(question);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject question with missing required fields', () => {
            const question = {
                rowNumber: 2,
                questionText: '', // Empty question text
                type: 'multiple_choice',
                correctAnswer: 'B',
                points: 1,
                difficulty: 'easy'
            };

            const result = excelQuestionService.validateSingleQuestion(question);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.type === 'REQUIRED_FIELD')).toBe(true);
        });

        it('should reject question with invalid type', () => {
            const question = {
                rowNumber: 2,
                questionText: 'What is 2 + 2?',
                type: 'invalid_type',
                correctAnswer: 'B',
                points: 1,
                difficulty: 'easy'
            };

            const result = excelQuestionService.validateSingleQuestion(question);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.type === 'INVALID_TYPE')).toBe(true);
        });

        it('should reject multiple choice with insufficient options', () => {
            const question = {
                rowNumber: 2,
                questionText: 'What is 2 + 2?',
                type: 'multiple_choice',
                answers: [
                    { id: 'A', text: '3', isCorrect: false }
                ], // Only one option
                correctAnswer: 'A',
                points: 1,
                difficulty: 'easy'
            };

            const result = excelQuestionService.validateSingleQuestion(question);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.type === 'INSUFFICIENT_OPTIONS')).toBe(true);
        });

        it('should reject true/false with invalid correct answer', () => {
            const question = {
                rowNumber: 2,
                questionText: 'The Earth is flat',
                type: 'true_false',
                correctAnswer: 'maybe', // Invalid for true/false
                points: 2,
                difficulty: 'easy'
            };

            const result = excelQuestionService.validateSingleQuestion(question);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.type === 'INVALID_TRUE_FALSE_ANSWER')).toBe(true);
        });
    });

    describe('transformRowToQuestion', () => {
        it('should transform Excel row to multiple choice question', () => {
            const row = {
                A: 'What is 2 + 2?',
                B: 'multiple_choice',
                C: '3',
                D: '4',
                E: '5',
                F: '6',
                G: 'B',
                H: '1',
                I: 'easy',
                J: 'Basic addition'
            };

            const question = excelQuestionService.transformRowToQuestion(row, 2);

            expect(question.questionText).toBe('What is 2 + 2?');
            expect(question.type).toBe('multiple_choice');
            expect(question.answers).toHaveLength(4);
            expect(question.answers[1].isCorrect).toBe(true); // Option B should be correct
            expect(question.correctAnswer).toBe('B');
            expect(question.points).toBe(1);
            expect(question.difficulty).toBe('easy');
        });

        it('should transform Excel row to true/false question', () => {
            const row = {
                A: 'The Earth is flat',
                B: 'true_false',
                C: '',
                D: '',
                E: '',
                F: '',
                G: 'false',
                H: '2',
                I: 'medium',
                J: 'Earth is spherical'
            };

            const question = excelQuestionService.transformRowToQuestion(row, 3);

            expect(question.questionText).toBe('The Earth is flat');
            expect(question.type).toBe('true_false');
            expect(question.answers).toHaveLength(0); // No options for true/false
            expect(question.correctAnswer).toBe('false');
            expect(question.points).toBe(2);
            expect(question.difficulty).toBe('medium');
        });

        it('should handle missing optional fields with defaults', () => {
            const row = {
                A: 'What is 2 + 2?',
                B: 'multiple_choice',
                C: '3',
                D: '4',
                E: '',
                F: '',
                G: 'B',
                H: '', // No points specified
                I: '', // No difficulty specified
                J: '' // No explanation
            };

            const question = excelQuestionService.transformRowToQuestion(row, 2);

            expect(question.points).toBe(1); // Default points
            expect(question.difficulty).toBe('medium'); // Default difficulty
            expect(question.explanation).toBe(''); // Empty explanation
            expect(question.answers).toHaveLength(2); // Only A and B options (C and D are empty)
        });
    });

    describe('generateTemplate', () => {
        it('should generate a valid Excel template', () => {
            const buffer = excelQuestionService.generateTemplate();

            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.length).toBeGreaterThan(0);

            // Try to parse the generated template
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            expect(workbook.SheetNames).toContain('Questions');

            const worksheet = workbook.Sheets['Questions'];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Use numeric header to get array of arrays

            // Should have header row and sample data
            expect(data.length).toBeGreaterThan(1);

            // Check header row content (data[0] contains the headers as array)
            expect(data[0][0]).toBe('Question Text');
            expect(data[0][1]).toBe('Question Type');
            expect(data[0][6]).toBe('Correct Answer');

            // Check sample data (data[1] contains the first sample question)
            expect(data[1][0]).toBe('What is 2 + 2?');
            expect(data[1][1]).toBe('multiple_choice');
            expect(data[1][6]).toBe('B');
        });
    });

    describe('utility functions', () => {
        it('should clean text properly', () => {
            expect(excelQuestionService.cleanText('  hello world  ')).toBe('hello world');
            expect(excelQuestionService.cleanText(null)).toBe('');
            expect(excelQuestionService.cleanText(undefined)).toBe('');
            expect(excelQuestionService.cleanText(123)).toBe('123');
        });

        it('should parse numbers with defaults', () => {
            expect(excelQuestionService.parseNumber('5', 1)).toBe(5);
            expect(excelQuestionService.parseNumber('invalid', 1)).toBe(1);
            expect(excelQuestionService.parseNumber('', 1)).toBe(1);
            expect(excelQuestionService.parseNumber(null, 1)).toBe(1);
        });
    });
});
