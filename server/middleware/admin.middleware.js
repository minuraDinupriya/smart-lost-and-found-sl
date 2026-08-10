const User = require('../models/User');

const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User ID missing from token.' });
    }
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin authorization required.' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Verify admin error:', error);
    res.status(500).json({ message: 'Server error during admin authorization.' });
  }
};

module.exports = { verifyAdmin };
