import express from 'express';
import multer from 'multer';
import { testController } from './controller.js';
import { authenticate } from '../auth/middleware.js';
import { authorize } from '../../middleware/authorize.js';
import { optionalAuth } from '../../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// All test routes require authentication
router.use(authenticate);

// Test management routes
router.get('/', testController.getTests);
router.get('/active/my-center', testController.getActiveTestsForStudent);
router.get('/:id', testController.getTestById);
router.get('/:id/enrollment-info', testController.getTestEnrollmentInfo);
router.post('/', authorize(['test_center_owner', 'test_creator']), testController.createTest);
router.put('/:id', authorize(['test_center_owner', 'test_creator']), testController.updateTest);
router.patch('/:id/status', authorize(['test_center_owner', 'test_creator']), testController.updateStatus);
router.put('/:id/enrollment-config', authorize(['test_center_owner', 'test_creator']), testController.updateEnrollmentConfig);
router.delete('/:id', testController.deleteTest);

// Question management routes
router.get('/:testId/questions', testController.getTestQuestions);
router.post('/:testId/questions', authorize(['test_center_owner', 'test_creator']), testController.addQuestion); // create new question inside test
router.post('/:testId/questions/manual', authorize(['test_center_owner', 'test_creator']), testController.addQuestionsManual);
router.post('/:testId/questions/auto', authorize(['test_center_owner', 'test_creator']), testController.addQuestionsAuto);
router.post('/:testId/questions/import-excel', authorize(['test_center_owner', 'test_creator']), upload.single('excelFile'), testController.importQuestionsExcel);
router.put('/:testId/questions/:questionId', authorize(['test_center_owner', 'test_creator']), testController.updateQuestion);
router.delete('/:testId/questions/:questionId', authorize(['test_center_owner', 'test_creator']), testController.deleteQuestion);

// Excel import routes (placeholder for next phase)
// Removed placeholder route that referenced a non-existent controller method

// Test taking routes (placeholder for student interface)
router.post('/:testId/start', testController.startTest);
router.post('/:testId/submit', testController.submitTest);
router.get('/:testId/session/:sessionId', testController.getTestSession);

export default router;