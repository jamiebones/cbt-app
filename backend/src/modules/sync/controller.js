const { logger } = require('../../config/logger');

class SyncController {
    downloadUsers = async (req, res) => {
        logger.info('Download users endpoint called');
        res.status(501).json({
            success: false,
            message: 'Download users not implemented yet'
        });
    };

    downloadTests = async (req, res) => {
        logger.info('Download tests endpoint called');
        res.status(501).json({
            success: false,
            message: 'Download tests not implemented yet'
        });
    };

    uploadResults = async (req, res) => {
        logger.info('Upload results endpoint called');
        res.status(501).json({
            success: false,
            message: 'Upload results not implemented yet'
        });
    };

    getSyncStatus = async (req, res) => {
        logger.info('Get sync status endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get sync status not implemented yet'
        });
    };

    updateSyncStatus = async (req, res) => {
        logger.info('Update sync status endpoint called');
        res.status(501).json({
            success: false,
            message: 'Update sync status not implemented yet'
        });
    };
}

const syncController = new SyncController();

module.exports = { syncController };