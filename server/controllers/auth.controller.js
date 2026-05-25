const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

module.exports = {
  register,
  login,
};
