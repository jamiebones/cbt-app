import express from 'express';
import { analyticsController } from './controller.js';

const router = express.Router();

// Analytics and reporting routes
router.get('/results/:testId', analyticsController.getTestResults);
router.get('/performance/:centerId', analyticsController.getCenterPerformance);
router.get('/reports/:centerId', analyticsController.generateReports);

// Export routes
router.get('/export/csv/:testId', analyticsController.exportResultsCSV);
router.get('/export/pdf/:testId', analyticsController.exportResultsPDF);

export default router;