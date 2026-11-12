const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { getOwnerHistory, getFinderHistory } = require('../controllers/history.controller');

// @route   GET /api/history/owner
// @desc    Get claimed items history for the logged-in owner
// @access  Private
router.get('/owner', verifyToken, getOwnerHistory);

// @route   GET /api/history/finder
// @desc    Get found and returned items history for the logged-in finder
// @access  Private
router.get('/finder', verifyToken, getFinderHistory);

module.exports = router;
