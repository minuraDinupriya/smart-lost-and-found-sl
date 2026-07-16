const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  createTip,
  getTipById,
  getUserTips,
  updateTipPaymentStatus,
  getReturnRecordById
} = require('../controllers/tip.controller');

// @route   POST /api/tips
// @desc    Initiate a tip & create checkout session
// @access  Private
router.post('/', verifyToken, createTip);

// @route   PUT /api/tips/payment-status
// @desc    Verify payment status and process updates
// @access  Private
router.put('/payment-status', verifyToken, updateTipPaymentStatus);

// @route   GET /api/tips/return-record/:id
// @desc    Fetch return record details
// @access  Private
router.get('/return-record/:id', verifyToken, getReturnRecordById);

// @route   GET /api/tips/:id
// @desc    Fetch single tip details
// @access  Private
router.get('/:id', verifyToken, getTipById);

// @route   GET /api/tips/user/:id
// @desc    Fetch a user's sent & received tips
// @access  Private
router.get('/user/:id', verifyToken, getUserTips);

module.exports = router;
