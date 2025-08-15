const express = require('express');
const { healthController } = require('./controller');

const router = express.Router();

// Health check endpoints
router.get('/', healthController.basicHealth);
router.get('/detailed', healthController.detailedHealth);
router.get('/ready', healthController.readinessCheck);
router.get('/live', healthController.livenessCheck);

module.exports = router;