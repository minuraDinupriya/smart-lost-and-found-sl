const notificationService = require('../../business/services/notification.service');

const getNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications(req.userId);
    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ message: 'Internal error fetching notifications.' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid notification ID.' });
    }
    const notification = await notificationService.markNotificationRead(req.params.id, req.userId);
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    return res.status(200).json(notification);
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ message: 'Internal error updating notification.' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await notificationService.markAllNotificationsRead(req.userId);
    return res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({ message: 'Internal error updating notifications.' });
  }
};

module.exports = { getNotifications, markNotificationRead, markAllNotificationsRead };
