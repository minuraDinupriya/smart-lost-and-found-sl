const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @desc    Retrieve all notifications for the logged-in user
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Internal error fetching notifications.' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    res.status(200).json(notification);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Internal error updating notification.' });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read for the user
// @access  Private
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Internal error updating notifications.' });
  }
});

module.exports = router;
