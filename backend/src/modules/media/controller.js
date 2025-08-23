import multer from 'multer';
import { mediaService } from './service.js';
import { subscriptionService } from '../subscriptions/service.js';
import { logger } from "../../config/logger.js";

// Configure multer for memory storage (we'll process files in memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB max file size
        files: 10 // Maximum 10 files at once
    },
    fileFilter: (req, file, cb) => {
        // Basic file type validation (will be validated more thoroughly in service)
        const allowedMimes = [
            // Images
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            // Audio
            'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a',
            // Video
            'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
        }
    }
});

class MediaController {
    // Upload single image
    uploadImage = [
        upload.single('image'),
        async (req, res) => {
            logger.info('Upload image endpoint called');

            try {
                if (!req.file) {
                    return res.status(400).json({
                        success: false,
                        message: 'No image file provided'
                    });
                }

                // Check subscription limits
                const validation = await subscriptionService.validateAction(
                    req.user.id,
                    'uploadMedia',
                    { fileSize: req.file.size, fileType: 'image' }
                );

                if (!validation.allowed) {
                    return res.status(403).json({
                        success: false,
                        message: validation.message
                    });
                }

                const ownerId = req.user.role === 'test_center_owner'
                    ? req.user.id
                    : req.user.testCenterOwner;

                const options = {
                    width: parseInt(req.body.width) || 1200,
                    height: parseInt(req.body.height) || 800,
                    quality: parseInt(req.body.quality) || 85
                };

                const result = await mediaService.uploadImage(
                    req.file.buffer,
                    req.file.originalname,
                    ownerId,
                    options
                );

                res.status(201).json({
                    success: true,
                    message: 'Image uploaded successfully',
                    data: result
                });

            } catch (error) {
                logger.error('Image upload error:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Failed to upload image'
                });
            }
        }
    ];

    // Upload single audio
    uploadAudio = [
        upload.single('audio'),
        async (req, res) => {
            logger.info('Upload audio endpoint called');

            try {
                if (!req.file) {
                    return res.status(400).json({
                        success: false,
                        message: 'No audio file provided'
                    });
                }

                // Check subscription limits
                const validation = await subscriptionService.validateAction(
                    req.user.id,
                    'uploadMedia',
                    { fileSize: req.file.size, fileType: 'audio' }
                );

                if (!validation.allowed) {
                    return res.status(403).json({
                        success: false,
                        message: validation.message
                    });
                }

                const ownerId = req.user.role === 'test_center_owner'
                    ? req.user.id
                    : req.user.testCenterOwner;

                const result = await mediaService.uploadAudio(
                    req.file.buffer,
                    req.file.originalname,
                    ownerId
                );

                res.status(201).json({
                    success: true,
                    message: 'Audio uploaded successfully',
                    data: result
                });

            } catch (error) {
                logger.error('Audio upload error:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Failed to upload audio'
                });
            }
        }
    ];

    // Upload single video
    uploadVideo = [
        upload.single('video'),
        async (req, res) => {
            logger.info('Upload video endpoint called');

            try {
                if (!req.file) {
                    return res.status(400).json({
                        success: false,
                        message: 'No video file provided'
                    });
                }

                // Check subscription limits
                const validation = await subscriptionService.validateAction(
                    req.user.id,
                    'uploadMedia',
                    { fileSize: req.file.size, fileType: 'video' }
                );

                if (!validation.allowed) {
                    return res.status(403).json({
                        success: false,
                        message: validation.message
                    });
                }

                const ownerId = req.user.role === 'test_center_owner'
                    ? req.user.id
                    : req.user.testCenterOwner;

                const options = {
                    quality: req.body.quality || 'medium',
                    maxWidth: parseInt(req.body.maxWidth) || 1280,
                    maxHeight: parseInt(req.body.maxHeight) || 720
                };

                const result = await mediaService.uploadVideo(
                    req.file.buffer,
                    req.file.originalname,
                    ownerId,
                    options
                );

                res.status(201).json({
                    success: true,
                    message: 'Video uploaded successfully',
                    data: result
                });

            } catch (error) {
                logger.error('Video upload error:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Failed to upload video'
                });
            }
        }
    ];

    // Upload multiple files
    uploadMultiple = [
        upload.array('files', 10),
        async (req, res) => {
            logger.info('Upload multiple files endpoint called');

            try {
                if (!req.files || req.files.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'No files provided'
                    });
                }

                const ownerId = req.user.role === 'test_center_owner'
                    ? req.user.id
                    : req.user.testCenterOwner;

                const results = [];
                const errors = [];

                for (const file of req.files) {
                    try {
                        // Determine file type
                        const fileType = file.mimetype.startsWith('image/') ? 'image' :
                            file.mimetype.startsWith('audio/') ? 'audio' :
                                file.mimetype.startsWith('video/') ? 'video' : 'unknown';

                        if (fileType === 'unknown') {
                            errors.push({
                                fileName: file.originalname,
                                error: 'Unsupported file type'
                            });
                            continue;
                        }

                        // Check subscription limits for each file
                        const validation = await subscriptionService.validateAction(
                            req.user.id,
                            'uploadMedia',
                            { fileSize: file.size, fileType }
                        );

                        if (!validation.allowed) {
                            errors.push({
                                fileName: file.originalname,
                                error: validation.message
                            });
                            continue;
                        }

                        let result;
                        if (fileType === 'image') {
                            result = await mediaService.uploadImage(file.buffer, file.originalname, ownerId);
                        } else if (fileType === 'audio') {
                            result = await mediaService.uploadAudio(file.buffer, file.originalname, ownerId);
                        } else if (fileType === 'video') {
                            result = await mediaService.uploadVideo(file.buffer, file.originalname, ownerId);
                        }

                        results.push(result);

                    } catch (error) {
                        errors.push({
                            fileName: file.originalname,
                            error: error.message
                        });
                    }
                }

                res.status(201).json({
                    success: true,
                    message: `${results.length} files uploaded successfully`,
                    data: {
                        uploaded: results,
                        errors: errors
                    }
                });

            } catch (error) {
                logger.error('Multiple file upload error:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Failed to upload files'
                });
            }
        }
    ];

    // Get media file info
    getMedia = async (req, res) => {
        logger.info('Get media endpoint called');

        try {
            const { fileName } = req.params;
            const { type = 'image' } = req.query;

            const mediaInfo = await mediaService.getMediaInfo(fileName, type);

            if (!mediaInfo.exists) {
                return res.status(404).json({
                    success: false,
                    message: 'Media file not found'
                });
            }

            res.json({
                success: true,
                data: mediaInfo
            });

        } catch (error) {
            logger.error('Get media error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get media info'
            });
        }
    };

    // Delete media file
    deleteMedia = async (req, res) => {
        logger.info('Delete media endpoint called');

        try {
            const { fileName } = req.params;
            const { type = 'image' } = req.query;

            const result = await mediaService.deleteMedia(fileName, type);

            res.json({
                success: true,
                message: 'Media file deleted successfully'
            });

        } catch (error) {
            logger.error('Delete media error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to delete media file'
            });
        }
    };

    // Get storage statistics
    getStorageStats = async (req, res) => {
        try {
            const ownerId = req.user.role === 'test_center_owner'
                ? req.user.id
                : req.user.testCenterOwner;

            const stats = await mediaService.getStorageStats(ownerId);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get storage stats error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get storage statistics'
            });
        }
    };

    // Optimize media (for existing files)
    optimizeMedia = async (req, res) => {
        logger.info('Optimize media endpoint called');
        res.status(501).json({
            success: false,
            message: 'Media optimization will be implemented in a future update'
        });
    };

    // Get media info with metadata
    getMediaInfo = async (req, res) => {
        logger.info('Get media info endpoint called');

        try {
            const { fileName } = req.params;
            const { type = 'image' } = req.query;

            const mediaInfo = await mediaService.getMediaInfo(fileName, type);

            res.json({
                success: true,
                data: mediaInfo
            });

        } catch (error) {
            logger.error('Get media info error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get media info'
            });
        }
    };
}

const mediaController = new MediaController();

export { mediaController };