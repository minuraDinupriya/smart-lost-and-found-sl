const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const {
  getNotifications, markNotificationRead, markAllNotificationsRead,
} = require('../controllers/notification.controller');

const router = express.Router();

router.get('/', verifyToken, getNotifications);
router.put('/read-all', verifyToken, markAllNotificationsRead);
router.put('/:id/read', verifyToken, markNotificationRead);

module.exports = router;
