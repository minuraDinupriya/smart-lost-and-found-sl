let io;
const userSockets = new Map();

const setIo = (socketIoInstance) => {
  io = socketIoInstance;
};

const addUserSocket = (userId, socketId) => {
  userSockets.set(userId.toString(), socketId);
};

const removeUserSocket = (userId) => {
  userSockets.delete(userId.toString());
};

const getSocketId = (userId) => {
  return userSockets.get(userId.toString());
};

const emitGlobalNotification = (userId, message) => {
  if (!io) return;
  const socketId = getSocketId(userId);
  if (socketId) {
    io.to(socketId).emit('global_notification', message);
  }
};

module.exports = {
  setIo,
  addUserSocket,
  removeUserSocket,
  getSocketId,
  emitGlobalNotification
};
