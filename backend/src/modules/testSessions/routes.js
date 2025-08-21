import express from 'express';
import { testSessionController } from './controller.js';
import { authenticate } from '../auth/middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Student routes - test taking
router.post('/tests/:testId/start', testSessionController.createSession);
router.get('/sessions/:sessionId', testSessionController.getSession);
router.post('/sessions/:sessionId/questions/:questionId/answer', testSessionController.submitAnswer);
router.post('/sessions/:sessionId/complete', testSessionController.completeSession);
router.post('/sessions/:sessionId/abandon', testSessionController.abandonSession);

// Student - get my sessions
router.get('/my-sessions', testSessionController.getMySessions);

// Admin routes - session management
router.get('/tests/:testId/sessions', testSessionController.getTestSessions);
router.get('/tests/:testId/analytics', testSessionController.getTestAnalytics);
router.post('/sessions/:sessionId/flag', testSessionController.flagSession);
router.put('/sessions/:sessionId/notes', testSessionController.updateAdminNotes);

// Admin - statistics
router.get('/stats', testSessionController.getOwnerStats);

// System/Admin - maintenance
router.post('/expire-overdue', testSessionController.expireOverdueSessions);

export default router;
