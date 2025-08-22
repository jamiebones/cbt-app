import express from 'express';
import { testController } from './controller.js';
import { authenticate } from '../auth/middleware.js';

const router = express.Router();

// All test routes require authentication
router.use(authenticate);

// Test management routes
router.get('/', testController.getTests);
router.get('/:id', testController.getTestById);
router.get('/:id/enrollment-info', testController.getTestEnrollmentInfo);
router.post('/', testController.createTest);
router.put('/:id', testController.updateTest);
router.put('/:id/enrollment-config', testController.updateEnrollmentConfig);
router.delete('/:id', testController.deleteTest);

// Question management routes
router.get('/:testId/questions', testController.getTestQuestions);
router.post('/:testId/questions', testController.addQuestion);
router.put('/:testId/questions/:questionId', testController.updateQuestion);
router.delete('/:testId/questions/:questionId', testController.deleteQuestion);

// Excel import routes (placeholder for next phase)
router.post('/import/excel', testController.importFromExcel);

// Test taking routes (placeholder for student interface)
router.post('/:testId/start', testController.startTest);
router.post('/:testId/submit', testController.submitTest);
router.get('/:testId/session/:sessionId', testController.getTestSession);

export default router;