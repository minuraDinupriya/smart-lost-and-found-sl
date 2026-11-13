const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../../config/security');
const { findUserRole, userExists } = require('../../data-access/repositories/user.repository');

const validUserId = userId => typeof userId === 'string' && /^[a-f0-9]{24}$/.test(userId);

const signSession = userId => jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: '7d' });
const decodeSession = token => jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });

const verifyTokenIdentity = token => {
  const decoded = decodeSession(token);
  const userId = decoded.userId || decoded.id;
  return validUserId(userId) ? userId : null;
};

const verifySocketIdentity = async token => {
  const decoded = decodeSession(token);
  const userId = decoded.id || decoded.userId;
  return validUserId(userId) && await userExists(userId) ? userId : null;
};

const findUserWithRole = async (userId, role) => {
  const user = await findUserRole(userId);
  return user?.role === role ? user : null;
};

module.exports = { signSession, verifyTokenIdentity, verifySocketIdentity, findUserWithRole };
