const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  // 1. Check if token exists in the Authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'No token provided, authorization denied.' });
  }

  // 2. Extract the actual token from "Bearer <token>"
  const token = authHeader.split(' ')[1];

  try {
    // 3. Verify the token using environment secret or hardcoded fallback
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_usjp_lost_and_found_dev';
    const decoded = jwt.verify(token, secret);
    
    // 4. Bind the decoded user ID to the request object
    // Assuming the payload contains the ID in either 'userId' or 'id'
    req.userId = decoded.userId || decoded.id; 
    
    next();
  } catch (error) {
    // Token is invalid or expired
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const User = require('../models/User');

const verifyPolice = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User ID missing from token.' });
    }
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'police') {
      return res.status(403).json({ message: 'Access denied. Police authorization required.' });
    }
    // Optionally attach the policeStationName to req for convenience
    req.policeStationName = user.policeStationName;
    next();
  } catch (error) {
    console.error('Verify police error:', error);
    res.status(500).json({ message: 'Server error during authorization.' });
  }
};

module.exports = { verifyToken, verifyPolice };
