const { verifyTokenIdentity, findUserWithRole } = require('../../business/services/session.service');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'No token provided, authorization denied.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const userId = verifyTokenIdentity(token);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token identity.' });
    }
    req.userId = userId;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const verifyPolice = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User ID missing from token.' });
    }
    const user = await findUserWithRole(req.userId, 'police');
    if (!user) {
      return res.status(403).json({ message: 'Access denied. Police authorization required.' });
    }
    req.policeStationName = user.policeStationName;
    next();
  } catch (error) {
    console.error('Verify police error:', error);
    res.status(500).json({ message: 'Server error during authorization.' });
  }
};

module.exports = { verifyToken, verifyPolice };
