const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { getHandoverState, confirmFinder, confirmOwner, confirmReceipt } = require('../controllers/handover.controller');
const { authorizeConversation } = require('../../business/services/chat.service');

router.use('/:itemId/:otherUserId', verifyToken, async (req, res, next) => {
  try {
    if (!await authorizeConversation(req.userId, req.params.otherUserId, req.params.itemId)) {
      return res.status(403).json({ message: 'Conversation access denied.' });
    }
    next();
  } catch {
    res.status(500).json({ message: 'Unable to authorize handover.' });
  }
});

// @route   GET /api/handovers/:itemId/:otherUserId
router.get('/:itemId/:otherUserId', verifyToken, getHandoverState);

// @route   POST /api/handovers/:itemId/:otherUserId/confirm-finder
router.post('/:itemId/:otherUserId/confirm-finder', verifyToken, confirmFinder);

// @route   POST /api/handovers/:itemId/:otherUserId/confirm-owner
router.post('/:itemId/:otherUserId/confirm-owner', verifyToken, confirmOwner);

// @route   POST /api/handovers/:itemId/:otherUserId/confirm-receipt
router.post('/:itemId/:otherUserId/confirm-receipt', verifyToken, confirmReceipt);

module.exports = router;
