const express = require('express');
const { analyticsController } = require('./controller');

const router = express.Router();

// Analytics and reporting routes
router.get('/results/:testId', analyticsController.getTestResults);
router.get('/performance/:centerId', analyticsController.getCenterPerformance);
router.get('/reports/:centerId', analyticsController.generateReports);

// Export routes
router.get('/export/csv/:testId', analyticsController.exportResultsCSV);
router.get('/export/pdf/:testId', analyticsController.exportResultsPDF);

module.exports = router;