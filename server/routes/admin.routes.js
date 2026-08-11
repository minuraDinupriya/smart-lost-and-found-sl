const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { verifyAdmin } = require('../middleware/admin.middleware');
const {
  getAdminStats,
  getAllItemsAdmin,
  updateItemStatusAdmin,
  deleteItemAdmin,
  getAllUsersAdmin,
  updateUserRoleAdmin,
  deleteUserAdmin,
} = require('../controllers/admin.controller');

// All routes require token verification AND admin role check
router.use(verifyToken, verifyAdmin);

// Stats route
router.get('/stats', getAdminStats);

// Item / Post moderation routes
router.get('/items', getAllItemsAdmin);
router.patch('/items/:id/status', updateItemStatusAdmin);
router.delete('/items/:id', deleteItemAdmin);

// User management routes
router.get('/users', getAllUsersAdmin);
router.patch('/users/:id/role', updateUserRoleAdmin);
router.delete('/users/:id', deleteUserAdmin);

module.exports = router;
