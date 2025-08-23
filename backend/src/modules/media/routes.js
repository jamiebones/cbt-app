import express from 'express';
import { mediaController } from './controller.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Media upload routes (for test center owners and creators)
router.post('/upload/image',
    requireRole(['test_center_owner', 'test_creator']),
    mediaController.uploadImage
);

router.post('/upload/audio',
    requireRole(['test_center_owner', 'test_creator']),
    mediaController.uploadAudio
);

router.post('/upload/video',
    requireRole(['test_center_owner', 'test_creator']),
    mediaController.uploadVideo
);

router.post('/upload/multiple',
    requireRole(['test_center_owner', 'test_creator']),
    mediaController.uploadMultiple
);

// Media management routes
router.get('/stats',
    requireRole(['test_center_owner', 'test_creator']),
    mediaController.getStorageStats
);

router.get('/:fileName', mediaController.getMedia);

router.delete('/:fileName',
    requireRole(['test_center_owner', 'test_creator']),
    mediaController.deleteMedia
);

// Media processing routes
router.post('/process/optimize',
    requireRole(['test_center_owner', 'test_creator']),
    mediaController.optimizeMedia
);

router.get('/info/:fileName', mediaController.getMediaInfo);

export default router;