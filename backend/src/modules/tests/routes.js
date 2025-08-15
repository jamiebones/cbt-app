const express = require('express');
const { testController } = require('./controller');

const router = express.Router();

// Test management routes
router.get('/', testController.getTests);
router.get('/:id', testController.getTestById);
router.post('/', testController.createTest);
router.put('/:id', testController.updateTest);
router.delete('/:id', testController.deleteTest);

// Question management routes
router.get('/:testId/questions', testController.getTestQuestions);
router.post('/:testId/questions', testController.addQuestion);
router.put('/:testId/questions/:questionId', testController.updateQuestion);
router.delete('/:testId/questions/:questionId', testController.deleteQuestion);

// Excel import routes
router.post('/import/excel', testController.importFromExcel);

// Test taking routes
router.post('/:testId/start', testController.startTest);
router.post('/:testId/submit', testController.submitTest);
router.get('/:testId/session/:sessionId', testController.getTestSession);

module.exports = router;