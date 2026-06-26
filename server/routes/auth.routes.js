const express = require('express');
const router = express.Router();
const { register, login, googleLogin, getMe, getLeaderboard } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);

// @route   POST /api/auth/google
// @desc    Authenticate user via Google
// @access  Public
router.post('/google', googleLogin);

// @route   GET /api/auth/leaderboard
// @desc    Get leaderboard
// @access  Public
router.get('/leaderboard', getLeaderboard);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', verifyToken, getMe);

module.exports = router;
