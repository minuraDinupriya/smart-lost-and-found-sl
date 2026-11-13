const { verifySocketIdentity } = require('../../business/services/session.service');

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: No token provided'));
    const userId = await verifySocketIdentity(token);
    if (!userId) return next(new Error('Authentication error: Invalid user'));
    socket.userId = userId;
    next();
  } catch {
    next(new Error('Authentication error: Invalid token'));
  }
};
module.exports = { authenticateSocket };
