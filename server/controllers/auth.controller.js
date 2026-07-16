const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
      profilePicture: user.profilePicture,
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
      profilePicture: user.profilePicture,
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

// @desc    Update user profile (username & profile picture)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error("Failed to clean up file:", err);
        }
      }
      return res.status(404).json({ message: 'User not found.' });
    }

    // 1. If username is being changed, verify uniqueness
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        // Clean up uploaded file if validation fails
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (err) {
            console.error("Failed to clean up file after username validation error:", err);
          }
        }
        return res.status(400).json({ message: 'Username is already taken.' });
      }
      user.username = username;
    }

    // 2. Handle Profile Picture upload if provided
    if (req.file) {
      // Check if Cloudinary is configured
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        try {
          const result = await cloudinary.uploader.upload(req.file.path);
          user.profilePicture = result.secure_url;

          // Clean up the temporary local file
          try {
            fs.unlinkSync(req.file.path);
          } catch (err) {
            console.error("Failed to clean up temporary local file:", err);
          }
        } catch (cloudinaryErr) {
          console.error("Cloudinary upload failed, falling back to local storage:", cloudinaryErr);
          // Fallback to local url
          const localUrl = `/uploads/${req.file.filename}`;
          user.profilePicture = localUrl;
        }
      } else {
        // Fallback: use local upload static URL
        const localUrl = `/uploads/${req.file.filename}`;
        user.profilePicture = localUrl;
      }
    }

    await user.save();

    // Return the updated user (excluding password)
    const updatedUser = await User.findById(userId).select('-password');
    res.status(200).json({
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    // Clean up uploaded file if error occurs
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Failed to clean up file after error:", err);
      }
    }
    res.status(500).json({ message: 'Server error during profile update.' });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  getMe,
  getLeaderboard,
  updateProfile,
};

