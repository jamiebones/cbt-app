const express = require('express');
const { userController } = require('./controller');

const router = express.Router();

// User management routes
router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

// Test center specific routes
router.get('/center/:centerId', userController.getUsersByCenter);
router.post('/center/:centerId/creators', userController.createTestCreator);
router.post('/center/:centerId/students', userController.registerStudent);

module.exports = router;