import express from 'express';
import { syncController } from './controller.js';

const router = express.Router();

// Data synchronization routes for offline test centers
router.post('/download-users', syncController.downloadUsers);
router.get('/download-tests/:packageId', syncController.downloadTests);
router.post('/export-package', syncController.exportPackage);
router.post('/upload-results', syncController.uploadResults);

// Sync status management routes
router.get('/status/:testCenterId', syncController.getSyncStatus);
router.put('/status', syncController.updateSyncStatus);

export default router;