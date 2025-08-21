import express from 'express';
import { subjectController } from './controller.js';
import { authenticate } from '../auth/middleware.js';

const router = express.Router();

// All subject routes require authentication
router.use(authenticate);

// Subject management routes
router.get('/', subjectController.getSubjects);
router.get('/categories', subjectController.getCategories);
router.get('/statistics', subjectController.getSubjectStatistics);
router.get('/:id', subjectController.getSubjectById);
router.post('/', subjectController.createSubject);
router.put('/:id', subjectController.updateSubject);
router.delete('/:id', subjectController.deleteSubject);

// Bulk operations
router.post('/default', subjectController.createDefaultSubjects);
router.put('/reorder', subjectController.updateSubjectOrder);

export default router;
