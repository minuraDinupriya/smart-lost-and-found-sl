const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { getHandoverState, confirmFinder, confirmOwner, confirmReceipt } = require('../controllers/handover.controller');

// @route   GET /api/handovers/:itemId/:otherUserId
router.get('/:itemId/:otherUserId', verifyToken, getHandoverState);

// @route   POST /api/handovers/:itemId/:otherUserId/confirm-finder
router.post('/:itemId/:otherUserId/confirm-finder', verifyToken, confirmFinder);

// @route   POST /api/handovers/:itemId/:otherUserId/confirm-owner
router.post('/:itemId/:otherUserId/confirm-owner', verifyToken, confirmOwner);

// @route   POST /api/handovers/:itemId/:otherUserId/confirm-receipt
router.post('/:itemId/:otherUserId/confirm-receipt', verifyToken, confirmReceipt);

module.exports = router;
