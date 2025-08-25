import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import our Excel service directly
import { excelQuestionService } from '../../modules/questions/excelService.js';

// Create a sample Excel file for testing
function createSampleExcelFile() {
    const questions = [
        {
            'Question Text': 'What is 2 + 2?',
            'Question Type': 'multiple_choice',
            'Option A': '3',
            'Option B': '4',
            'Option C': '5',
            'Option D': '6',
            'Correct Answer': 'B',
            'Points': 1,
            'Difficulty': 'easy',
            'Explanation': 'Basic addition: 2 + 2 = 4'
        },
        {
            'Question Text': 'The earth is round.',
            'Question Type': 'true_false',
            'Option A': 'True',
            'Option B': 'False',
            'Option C': '',
            'Option D': '',
            'Correct Answer': 'A',
            'Points': 1,
            'Difficulty': 'easy',
            'Explanation': 'The earth is approximately spherical.'
        },
        {
            'Question Text': 'What is the capital of France?',
            'Question Type': 'multiple_choice',
            'Option A': 'London',
            'Option B': 'Berlin',
            'Option C': 'Paris',
            'Option D': 'Madrid',
            'Correct Answer': 'C',
            'Points': 2,
            'Difficulty': 'medium',
            'Explanation': 'Paris is the capital and largest city of France.'
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(questions);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

    const filePath = path.join(__dirname, 'sample-questions.xlsx');
    XLSX.writeFile(workbook, filePath);
    return filePath;
}

async function testExcelServiceDirectly() {
    console.log('Excel Service Direct Test');
    console.log('=========================');

    try {
        console.log('Creating sample Excel file...');
        const excelFilePath = createSampleExcelFile();
        console.log('✓ Sample Excel file created:', excelFilePath);

        // Read the Excel file as buffer
        const fileBuffer = fs.readFileSync(excelFilePath);

        console.log('\n1. Testing Excel file parsing...');
        const parseResult = await excelQuestionService.parseExcelFile(fileBuffer);
        console.log('✓ Parse Result:');
        console.log(`  - Total rows: ${parseResult.totalRows}`);
        console.log(`  - Questions found: ${parseResult.questions.length}`);
        console.log(`  - Headers: ${parseResult.headers.join(', ')}`);

        console.log('\n2. Testing individual question validation...');
        for (let i = 0; i < parseResult.questions.length; i++) {
            const question = parseResult.questions[i];
            const validation = await excelQuestionService.validateSingleQuestion(question);
            console.log(`  Question ${i + 1}: ${validation.isValid ? '✓ Valid' : '✗ Invalid'}`);
            if (!validation.isValid) {
                console.log(`    Errors: ${validation.errors.map(e => e.message).join(', ')}`);
            }
        }

        console.log('\n3. Testing template generation...');
        const templateBuffer = await excelQuestionService.generateTemplate();
        const templatePath = path.join(__dirname, 'generated-template.xlsx');
        fs.writeFileSync(templatePath, templateBuffer);
        console.log('✓ Template generated:', templatePath);

        // Verify template structure
        const templateWorkbook = XLSX.read(templateBuffer);
        const templateWorksheet = templateWorkbook.Sheets[templateWorkbook.SheetNames[0]];
        const templateData = XLSX.utils.sheet_to_json(templateWorksheet);
        console.log(`  - Template headers: ${Object.keys(templateData[0] || {}).join(', ')}`);

        console.log('\n4. Testing data transformation...');
        parseResult.questions.forEach((question, index) => {
            const transformed = excelQuestionService.transformRowToQuestion(question, index + 2);
            console.log(`  Question ${index + 1}: ${transformed.questionText.substring(0, 50)}...`);
            console.log(`    Type: ${transformed.type}, Difficulty: ${transformed.difficulty}, Points: ${transformed.points}`);
        });

        // Clean up
        fs.unlinkSync(excelFilePath);
        fs.unlinkSync(templatePath);
        console.log('\n✓ Test files cleaned up');

        console.log('\n🎉 All Excel service tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Test with invalid data
async function testErrorHandling() {
    console.log('\n\nError Handling Test');
    console.log('===================');

    try {
        // Test with invalid Excel data
        const invalidQuestions = [
            {
                'Question Text': '', // Empty question text
                'Question Type': 'invalid_type', // Invalid type
                'Option A': 'A',
                'Option B': 'B',
                'Option C': 'C',
                'Option D': 'D',
                'Correct Answer': 'E', // Invalid correct answer
                'Points': -5, // Invalid points
                'Difficulty': 'super_hard', // Invalid difficulty
                'Explanation': ''
            }
        ];

        console.log('1. Testing validation with invalid data...');
        for (const question of invalidQuestions) {
            const validation = await excelQuestionService.validateSingleQuestion(question);
            console.log(`  Invalid question validation: ${validation.isValid ? '✓ Valid' : '✗ Invalid'}`);
            if (!validation.isValid) {
                console.log('  Errors found:');
                validation.errors.forEach(error => {
                    console.log(`    - ${error.field}: ${error.message}`);
                });
            }
        }

        // Test with empty buffer
        console.log('\n2. Testing with empty buffer...');
        try {
            await excelQuestionService.parseExcelFile(Buffer.alloc(0));
        } catch (error) {
            console.log(`  ✓ Empty buffer error handled: ${error.message}`);
        }

        // Test with corrupted data
        console.log('\n3. Testing with corrupted data...');
        try {
            await excelQuestionService.parseExcelFile(Buffer.from('not-excel-data'));
        } catch (error) {
            console.log(`  ✓ Corrupted data error handled: ${error.message}`);
        }

        console.log('\n✓ Error handling tests completed');

    } catch (error) {
        console.error('❌ Error handling test failed:', error.message);
    }
}

// Run all tests
async function runAllTests() {
    await testExcelServiceDirectly();
    await testErrorHandling();
}

runAllTests();
