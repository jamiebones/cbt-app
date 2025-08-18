import express from 'express';
import { mediaController } from './controller.js';

const router = express.Router();

// Media upload and management routes
router.post('/upload/image', mediaController.uploadImage);
router.post('/upload/audio', mediaController.uploadAudio);
router.get('/:id', mediaController.getMedia);
router.delete('/:id', mediaController.deleteMedia);

// Media processing routes
router.post('/process/optimize', mediaController.optimizeMedia);
router.get('/info/:id', mediaController.getMediaInfo);

export default router;