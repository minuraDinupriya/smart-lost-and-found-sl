const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Item = require('../models/Item');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth.middleware');
const { generatePoliceHandoverPDF } = require('../services/pdf.service');

// @route   GET /api/messages/unread-count
// @desc    Get total count of unread messages for the logged-in user
// @access  Private
router.get('/messages/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await Message.countDocuments({ receiverId: req.userId, isRead: false });
    res.status(200).json({ count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ message: 'Internal error fetching unread count.' });
  }
});

// @route   GET /api/messages/inbox
// @desc    Fetch latest messages for all active chat threads of the user
// @access  Private
router.get('/messages/inbox', verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ senderId: req.userId }, { receiverId: req.userId }]
    })
    .sort({ createdAt: -1 })
    .populate('itemId', 'title imageUrl type')
    .populate('senderId', 'username')
    .populate('receiverId', 'username');

    // Deduplicate by itemId to get only the latest message per thread
    const seenItems = new Set();
    const inboxThreads = [];
    for (const msg of messages) {
      if (msg.itemId && !seenItems.has(msg.itemId._id.toString())) {
        seenItems.add(msg.itemId._id.toString());
        inboxThreads.push(msg);
      }
    }

    res.status(200).json(inboxThreads);
  } catch (error) {
    console.error('Inbox aggregation error:', error);
    res.status(500).json({ message: 'Internal error fetching inbox.' });
  }
});

// @route   GET /api/messages/:itemId
// @desc    Fetch comprehensive chat history for an item's negotiation room
// @access  Private
router.get('/messages/:itemId', verifyToken, async (req, res) => {
  try {
    // Auto-read protocol: Mark all messages in this room sent to the user as read
    await Message.updateMany(
      { itemId: req.params.itemId, receiverId: req.userId, isRead: false },
      { $set: { isRead: true } }
    );

    const messages = await Message.find({ itemId: req.params.itemId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error('Database message retrieval error:', error);
    res.status(500).json({ message: 'Internal error fetching chat logs.' });
  }
});

// @route   GET /api/items/:itemId/download-pdf
// @desc    Trigger pdfkit generation and stream Police Handover Declaration
// @access  Private
router.get('/items/:itemId/download-pdf', verifyToken, async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item lookup failed' });
    
    const user = await User.findById(req.userId); // req.userId extracted securely by middleware
    if (!user) return res.status(404).json({ message: 'User verification failed' });

    // Stream the generated PDF directly out through the HTTP response pipe
    generatePoliceHandoverPDF(item, user, res);
  } catch (error) {
    console.error('PDF Generation Service Error:', error);
    res.status(500).json({ message: 'Engine failure generating official PDF document' });
  }
});

module.exports = router;
