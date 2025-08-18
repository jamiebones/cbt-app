import { logger } from "../../config/logger.js";

class TestController {
    getTests = async (req, res) => {
        logger.info('Get tests endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get tests not implemented yet'
        });
    };

    getTestById = async (req, res) => {
        logger.info('Get test by ID endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get test by ID not implemented yet'
        });
    };

    createTest = async (req, res) => {
        logger.info('Create test endpoint called');
        res.status(501).json({
            success: false,
            message: 'Create test not implemented yet'
        });
    };

    updateTest = async (req, res) => {
        logger.info('Update test endpoint called');
        res.status(501).json({
            success: false,
            message: 'Update test not implemented yet'
        });
    };

    deleteTest = async (req, res) => {
        logger.info('Delete test endpoint called');
        res.status(501).json({
            success: false,
            message: 'Delete test not implemented yet'
        });
    };

    getTestQuestions = async (req, res) => {
        logger.info('Get test questions endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get test questions not implemented yet'
        });
    };

    addQuestion = async (req, res) => {
        logger.info('Add question endpoint called');
        res.status(501).json({
            success: false,
            message: 'Add question not implemented yet'
        });
    };

    updateQuestion = async (req, res) => {
        logger.info('Update question endpoint called');
        res.status(501).json({
            success: false,
            message: 'Update question not implemented yet'
        });
    };

    deleteQuestion = async (req, res) => {
        logger.info('Delete question endpoint called');
        res.status(501).json({
            success: false,
            message: 'Delete question not implemented yet'
        });
    };

    importFromExcel = async (req, res) => {
        logger.info('Import from Excel endpoint called');
        res.status(501).json({
            success: false,
            message: 'Import from Excel not implemented yet'
        });
    };

    startTest = async (req, res) => {
        logger.info('Start test endpoint called');
        res.status(501).json({
            success: false,
            message: 'Start test not implemented yet'
        });
    };

    submitTest = async (req, res) => {
        logger.info('Submit test endpoint called');
        res.status(501).json({
            success: false,
            message: 'Submit test not implemented yet'
        });
    };

    getTestSession = async (req, res) => {
        logger.info('Get test session endpoint called');
        res.status(501).json({
            success: false,
            message: 'Get test session not implemented yet'
        });
    };
}

const testController = new TestController();

export { testController };