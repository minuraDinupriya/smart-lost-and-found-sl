const Notification = require('../models/Notification');

const findForUser = userId => Notification.find({ userId }).sort({ createdAt: -1 });
const markRead = (id, userId) => Notification.findOneAndUpdate(
  { _id: id, userId }, { $set: { isRead: true } }, { new: true }
);
const markAllRead = userId => Notification.updateMany(
  { userId, isRead: false }, { $set: { isRead: true } }
);
const createNotification = data => Notification.create(data);

module.exports = { findForUser, markRead, markAllRead, createNotification };
