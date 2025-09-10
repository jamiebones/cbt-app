/**
 * Script: generateSampleQuestionsExcel.js
 * Purpose: Generates an Excel file (sample-questions-100.xlsx) with 100 sample questions
 * matching the expected import template columns:
 * [Question Text, Question Type, Option A, Option B, Option C, Option D, Correct Answer, Points, Difficulty, Explanation]
 *
 * Usage:
 *   node backend/scripts/generateSampleQuestionsExcel.js
 * Output:
 *   backend/scripts/sample-questions-100.xlsx
 */
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

// Configuration
const TOTAL = 100;
const TRUE_FALSE_COUNT = 20; // last 20 will be true_false
const MC_COUNT = TOTAL - TRUE_FALSE_COUNT; // first 80 multiple_choice

// Difficulty distribution: 40 easy, 40 medium, 20 hard
const difficultyForIndex = (i) => {
    if (i < 40) return 'easy';
    if (i < 80) return 'medium';
    return 'hard';
};

// Points by difficulty
const pointsForDifficulty = (d) => (d === 'easy' ? 1 : d === 'medium' ? 2 : 3);

// Rotate correct answer letters for multiple choice to exercise parser
const correctLetters = ['A', 'B', 'C', 'D'];

const rows = [];
// Header
rows.push([
    'Question Text',
    'Question Type',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Answer',
    'Points',
    'Difficulty',
    'Explanation'
]);

for (let i = 1; i <= TOTAL; i++) {
    const difficulty = difficultyForIndex(i - 1);
    const points = pointsForDifficulty(difficulty);

    if (i <= MC_COUNT) {
        // Multiple choice question
        // Simple arithmetic pattern so answers look plausible
        const base = i + 10; // base number to vary questions
        const correctIndex = (i - 1) % 4; // rotate A-D
        const correctLetter = correctLetters[correctIndex];

        // Build options ensuring exactly one correct
        // We'll define correct value as base * 2
        const correctValue = base * 2;
        const distractors = [base * 2 - 1, base * 2 + 1, base * 2 + 2];
        // Place correct value in rotating slot
        const optionValues = [];
        for (let pos = 0; pos < 4; pos++) {
            if (pos === correctIndex) optionValues.push(correctValue.toString());
            else optionValues.push(distractors.shift().toString());
        }

        rows.push([
            `Sample MC Question ${i}: What is ${base} * 2?`, // Question Text
            'multiple_choice', // Question Type
            optionValues[0], // A
            optionValues[1], // B
            optionValues[2], // C
            optionValues[3], // D
            correctLetter, // Correct Answer (letter)
            points.toString(), // Points
            difficulty, // Difficulty
            `The result of ${base} * 2 is ${correctValue}.` // Explanation
        ]);
    } else {
        // True/False question
        const idx = i - MC_COUNT; // 1..TRUE_FALSE_COUNT
        const number = idx + 20; // pick a number
        const isEven = number % 2 === 0;
        rows.push([
            `Sample TF Question ${i}: The number ${number} is even.`, // Question Text
            'true_false', // Question Type
            '', // Option A
            '', // Option B
            '', // Option C
            '', // Option D
            isEven ? 'true' : 'false', // Correct Answer (literal true/false)
            points.toString(), // Points
            difficulty, // Difficulty
            `Because ${number} % 2 = ${number % 2}, the statement is ${isEven ? 'true' : 'false'}.` // Explanation
        ]);
    }
}

// Create workbook & sheet
const worksheet = XLSX.utils.aoa_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

// Autosize columns (approx by setting !cols widths)
const colWidths = rows[0].map((_, colIdx) => {
    let maxLen = 10;
    for (let r = 0; r < rows.length; r++) {
        const cell = rows[r][colIdx];
        if (cell && cell.toString().length > maxLen) {
            maxLen = cell.toString().length;
        }
    }
    return { wch: Math.min(60, Math.max(12, maxLen + 2)) };
});
worksheet['!cols'] = colWidths;

const outPath = path.resolve('backend', 'scripts', 'sample-questions-100.xlsx');
XLSX.writeFile(workbook, outPath, { bookType: 'xlsx' });

console.log(`✅ Generated sample Excel file with ${TOTAL} questions at: ${outPath}`);
console.log('   - Multiple choice:', MC_COUNT, ' True/False:', TRUE_FALSE_COUNT);
console.log('   - Ready for upload using bulk import endpoints');
