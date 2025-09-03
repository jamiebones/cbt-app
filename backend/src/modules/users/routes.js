import express from 'express';
import { userController } from './controller.js';
import { authenticate } from '../auth/middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// User management routes
router.get('/', userController.getUsers);
// router.get('/:id', userController.getUserById); // Not implemented
// router.post('/', userController.createUser); // Not implemented
// router.put('/:id', userController.updateUser); // Not implemented
// router.delete('/:id', userController.deleteUser); // Not implemented

// Test center specific routes
// router.get('/center/:centerId', userController.getUsersByCenter); // Not implemented
router.post('/center/create-test-creators', userController.createTestCreator);
// router.post('/center/:centerId/students', userController.registerStudent); // Not implemented
router.post('/center/create-test-center-owners', userController.createTestCenterOwner);

// Super admin routes
router.get('/test-center-owners', userController.getTestCenterOwners);

export default router;