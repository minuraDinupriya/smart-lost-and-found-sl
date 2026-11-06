const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config/security');
const { validId } = require('../services/chat.service');

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: No token provided'));
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    const userId = decoded.id || decoded.userId;
    if (!validId(userId) || !await User.exists({ _id: userId })) return next(new Error('Authentication error: Invalid user'));
    socket.userId = userId;
    next();
  } catch {
    next(new Error('Authentication error: Invalid token'));
  }
};
module.exports = { authenticateSocket };
