const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // All routes protected

// Allowed roles: Superadmin and Company Admin
router.get('/', authorize('superadmin', 'company_admin', 'agent'), userController.getAllUsers);
router.post('/', authorize('superadmin', 'company_admin'), userController.createUser);
router.put('/:id', authorize('superadmin', 'company_admin'), userController.updateUser);
router.delete('/:id', authorize('superadmin', 'company_admin'), userController.deleteUser);

module.exports = router;
