import express from 'express';
import { analyticsController } from './controller.js';
import { authenticate } from '../auth/middleware.js';

const router = express.Router();

// Apply authentication to all analytics routes
router.use(authenticate);

// Test analytics routes
router.get('/test-results/:testId', analyticsController.getTestResults);

// Center performance routes
router.get('/center-performance/:centerId', analyticsController.getCenterPerformance);

// Student performance routes
router.get('/student-performance/:studentId', analyticsController.getStudentPerformance);

// Dashboard analytics
router.get('/dashboard/:centerId?', analyticsController.getDashboardAnalytics);

// Report generation routes
router.get('/reports/:centerId', analyticsController.generateReports);

// Export routes
router.get('/export/csv/:testId', analyticsController.exportResultsCSV);
router.get('/export/pdf/:testId', analyticsController.exportResultsPDF);

export default router;