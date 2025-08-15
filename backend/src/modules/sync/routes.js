const express = require('express');
const { syncController } = require('./controller');

const router = express.Router();

// Data synchronization routes
router.post('/download/users', syncController.downloadUsers);
router.post('/download/tests', syncController.downloadTests);
router.post('/upload/results', syncController.uploadResults);

// Sync status routes
router.get('/status', syncController.getSyncStatus);
router.post('/status/update', syncController.updateSyncStatus);

module.exports = router;