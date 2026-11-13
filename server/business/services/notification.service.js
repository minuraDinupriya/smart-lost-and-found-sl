const repository = require('../../data-access/repositories/notification.repository');
const { emitGlobalNotification } = require('./socket.service');

const getNotifications = userId => repository.findForUser(userId);
const markNotificationRead = (id, userId) => repository.markRead(id, userId);
const markAllNotificationsRead = userId => repository.markAllRead(userId);

const notifyUser = async ({ userId, message, type }) => {
  const notification = await repository.createNotification({ userId, message, type });
  emitGlobalNotification(userId, {
    _id: notification._id,
    text: message,
    type,
    createdAt: notification.createdAt,
  });
};

module.exports = { getNotifications, markNotificationRead, markAllNotificationsRead, notifyUser };
