import express from 'express';
import { healthController } from './controller.js';

const router = express.Router();

// Health check endpoints
router.get('/', healthController.basicHealth);
router.get('/detailed', healthController.detailedHealth);
router.get('/ready', healthController.readinessCheck);
router.get('/live', healthController.livenessCheck);

export default router;