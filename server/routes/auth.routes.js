const express = require('express');
const router = express.Router();
const { register, login, googleLogin, getLeaderboard } = require('../controllers/auth.controller');

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

module.exports = router;
