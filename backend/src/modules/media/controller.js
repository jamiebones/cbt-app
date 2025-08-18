import { logger } from "../../config/logger.js";

class MediaController {
    uploadImage = async (req, res) => {
        logger.info('Upload image endpoint called');
        res.status(501).json({
            success: false,
            message: 'Upload image not implemented yet'
        });
    };

    uploadAudio = async (req, res) => {
        logger.info('Upload audio endpoint called');
        res.status(501).json({
            success: false,
            message: 'Upload audio not implemented yet'
        });
    };

    getMedia = async (req, res) => {
        logger.info('Get media endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get media not implemented yet'
        });
    };

    deleteMedia = async (req, res) => {
        logger.info('Delete media endpoint called');
        res.status(501).json({
            success: false,
            message: 'Delete media not implemented yet'
        });
    };

    optimizeMedia = async (req, res) => {
        logger.info('Optimize media endpoint called');
        res.status(501).json({
            success: false,
            message: 'Optimize media not implemented yet'
        });
    };

    getMediaInfo = async (req, res) => {
        logger.info('Get media info endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get media info not implemented yet'
        });
    };
}

const mediaController = new MediaController();

export { mediaController };