import { syncService } from './service.js';
import { TestEnrollment } from '../../models/index.js';
import { logger } from "../../config/logger.js";

class SyncController {
    constructor() {
        this.service = syncService;
    }

    /**
     * Download student registration data for offline testing of a specific test
     * POST /api/sync/download-users
     * Body: { testCenterId, testId }
     */
    downloadUsers = async (req, res) => {
        try {
            const { testCenterId, testId } = req.body;

            if (!testCenterId || !testId) {
                return res.status(400).json({
                    success: false,
                    message: 'Test center ID and test ID are required'
                });
            }

            logger.info(`Creating download package for test center ${testCenterId} for test ${testId}`);
            const packageData = await this.service.createDownloadPackage(testCenterId, testId);

            if (!packageData.packageId) {
                return res.status(404).json({
                    success: false,
                    message: packageData.message
                });
            }

            res.json({
                success: true,
                message: packageData.message,
                packageId: packageData.packageId,
                data: packageData.data
            });

        } catch (error) {
            logger.error('Error in downloadUsers:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create download package',
                error: error.message
            });
        }
    };

    /**
     * Download test data with questions for offline delivery
     * GET /api/sync/download-tests/:packageId
     */
    downloadTests = async (req, res) => {
        try {
            const { packageId } = req.params;

            if (!packageId) {
                return res.status(400).json({
                    success: false,
                    message: 'Package ID is required'
                });
            }

            logger.info(`Download tests requested for package ${packageId}`);

            // Test data is included in the main download package for performance
            res.json({
                success: true,
                message: 'Test data is included in the main download package',
                note: 'Use the downloadUsers endpoint to get complete package data including tests'
            });

        } catch (error) {
            logger.error('Error in downloadTests:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve test data',
                error: error.message
            });
        }
    };

    /**
     * Export package data in different formats (JSON, CSV, SQL)
     * POST /api/sync/export-package
     * Body: { packageData, format: 'json'|'csv'|'sql' }
     */
    exportPackage = async (req, res) => {
        try {
            const { packageData, format = 'json' } = req.body;

            if (!packageData) {
                return res.status(400).json({
                    success: false,
                    message: 'Package data is required'
                });
            }

            logger.info(`Exporting package in ${format} format`);
            const exportedData = await this.service.exportPackageData(packageData, format);

            // Set appropriate content type based on format
            let contentType = 'application/json';
            if (format === 'csv') {
                contentType = 'application/zip'; // Multiple CSV files
            } else if (format === 'sql') {
                contentType = 'application/sql';
            }

            res.setHeader('Content-Type', contentType);
            res.json({
                success: true,
                message: `Package exported in ${format} format`,
                format: exportedData.format,
                files: exportedData.files,
                instructions: exportedData.instructions
            });

        } catch (error) {
            logger.error('Error in exportPackage:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export package',
                error: error.message
            });
        }
    };    /**
     * Upload test results from offline test center
     * POST /api/sync/upload-results
     * Body: { packageId, testCenterId, results: [] }
     */
    uploadResults = async (req, res) => {
        try {
            const resultData = req.body;

            if (!resultData.packageId || !resultData.results) {
                return res.status(400).json({
                    success: false,
                    message: 'Package ID and results data are required'
                });
            }

            logger.info(`Processing results upload for package ${resultData.packageId}`);
            const processedResults = await this.service.processResultsUpload(resultData);

            res.json({
                success: true,
                message: processedResults.message,
                packageId: processedResults.packageId,
                summary: processedResults.summary,
                details: processedResults.details
            });

        } catch (error) {
            logger.error('Error in uploadResults:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process results upload',
                error: error.message
            });
        }
    };

    /**
     * Get synchronization status for a test center
     * GET /api/sync/status/:testCenterId?from=date&to=date
     */
    getSyncStatus = async (req, res) => {
        try {
            const { testCenterId } = req.params;
            const { from, to } = req.query;

            if (!testCenterId) {
                return res.status(400).json({
                    success: false,
                    message: 'Test center ID is required'
                });
            }

            // Default to last 30 days if dates not provided
            const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const toDate = to ? new Date(to) : new Date();

            logger.info(`Getting sync status for test center ${testCenterId} from ${fromDate} to ${toDate}`);
            const syncStatus = await this.service.getSyncStatus(testCenterId, fromDate, toDate);

            res.json({
                success: true,
                data: syncStatus
            });

        } catch (error) {
            logger.error('Error in getSyncStatus:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get sync status',
                error: error.message
            });
        }
    };

    /**
     * Update sync status for specific enrollments
     * PUT /api/sync/status
     * Body: { enrollmentIds: [], status: string }
     */
    updateSyncStatus = async (req, res) => {
        try {
            const { enrollmentIds, status } = req.body;

            if (!enrollmentIds || !Array.isArray(enrollmentIds) || !status) {
                return res.status(400).json({
                    success: false,
                    message: 'Enrollment IDs array and status are required'
                });
            }

            const validStatuses = ['registered', 'downloaded', 'test_taken', 'results_uploaded'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }

            logger.info(`Updating sync status for ${enrollmentIds.length} enrollments to ${status}`);

            const result = await TestEnrollment.updateMany(
                { _id: { $in: enrollmentIds } },
                {
                    syncStatus: status,
                    'syncMetadata.lastModified': new Date()
                }
            );

            res.json({
                success: true,
                message: `Updated ${result.modifiedCount} enrollments`,
                updated: result.modifiedCount
            });

        } catch (error) {
            logger.error('Error in updateSyncStatus:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update sync status',
                error: error.message
            });
        }
    };
}

const syncController = new SyncController();

export { syncController };