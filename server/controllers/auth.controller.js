const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    // 2. Hash the password with salt round of 10
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create and save the new user
    const newUser = new User({
      username,
      password: hashedPassword,
    });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // 2. Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // 3. Sign JWT containing the user's id
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_usjp_lost_and_found_dev';
    const token = jwt.sign({ id: user._id }, secret, { expiresIn: '7d' });

    // 4. Return token, username, and userId
    res.status(200).json({
      token,
      username: user.username,
      userId: user._id,
      role: user.role,
      policeStationName: user.policeStationName,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user already exists
    let user = await User.findOne({ 
      $or: [{ googleId }, { email }]
    });

    if (!user) {
      // Check if username is taken, if so, append random string
      let username = name.replace(/\s+/g, '').toLowerCase();
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        username = `${username}${Math.floor(Math.random() * 10000)}`;
      }

      // Create new user without a password
      user = new User({
        username,
        googleId,
        email,
        profilePicture: picture,
      });
      await user.save();
    } else if (!user.googleId) {
      // Link Google account to existing user by email
      user.googleId = googleId;
      user.profilePicture = picture;
      await user.save();
    }

    // Sign JWT
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_usjp_lost_and_found_dev';
    const jwtToken = jwt.sign({ id: user._id }, secret, { expiresIn: '7d' });

    res.status(200).json({
      token: jwtToken,
      username: user.username,
      userId: user._id,
      role: user.role,
      policeStationName: user.policeStationName,
    });
  } catch (error) {
    console.error('Google Login error:', error);
    res.status(500).json({ message: 'Server error during Google Login.' });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get top users by karma points
// @route   GET /api/auth/leaderboard
// @access  Public
const getLeaderboard = async (req, res) => {
  try {
    const users = await User.find()
      .select('username karmaPoints')
      .sort({ karmaPoints: -1 })
      .limit(10);
    res.status(200).json({ leaderboard: users });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  getMe,
  getLeaderboard,
};
