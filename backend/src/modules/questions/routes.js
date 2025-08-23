import { Router } from 'express';
import { questionController } from './controller.js';
import { authenticate } from '../auth/middleware.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/questions - Get all questions with filtering and pagination
router.get('/', questionController.getQuestions);

// GET /api/questions/search - Advanced search
router.get('/search', questionController.searchQuestions);

// GET /api/questions/statistics - Get question statistics
router.get('/statistics', questionController.getQuestionStatistics);

// GET /api/questions/subject/:subjectId - Get questions by subject
router.get('/subject/:subjectId', questionController.getQuestionsBySubject);

// POST /api/questions/auto-select - Auto-select random questions
router.post('/auto-select', questionController.autoSelectQuestions);

// POST /api/questions/auto-select/preview - Preview auto-selection
router.post('/auto-select/preview', questionController.previewAutoSelection);

// POST /api/questions/bulk-import - Bulk import questions from Excel
router.post('/bulk-import', questionController.upload.single('excelFile'), questionController.bulkImportQuestions);

// POST /api/questions/bulk-import/preview - Preview Excel import
router.post('/bulk-import/preview', questionController.upload.single('excelFile'), questionController.previewExcelImport);

// GET /api/questions/bulk-import/template - Download Excel template
router.get('/bulk-import/template', questionController.downloadExcelTemplate);

// GET /api/questions/bulk-import/status/:batchId - Get import batch status  
router.get('/bulk-import/status/:batchId', questionController.getImportBatchStatus);

// GET /api/questions/:id - Get a specific question by ID
router.get('/:id', questionController.getQuestionById);

// POST /api/questions - Create a new question
router.post('/', questionController.createQuestion);

// PUT /api/questions/:id - Update an existing question
router.put('/:id', questionController.updateQuestion);

// DELETE /api/questions/:id - Delete a question
router.delete('/:id', questionController.deleteQuestion);

// POST /api/questions/:id/duplicate - Duplicate a question
router.post('/:id/duplicate', questionController.duplicateQuestion);

export default router;
