const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const chatService = require('../../business/services/chat.service');
const { preparePoliceHandover } = require('../../business/services/pdf.service');

const router = express.Router();

router.get('/messages/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await chatService.countUnread(req.userId);
    return res.status(200).json({ count });
  } catch (error) {
    console.error('Unread count error:', error);
    return res.status(500).json({ message: 'Internal error fetching unread count.' });
  }
});

router.put('/messages/mark-all-read', verifyToken, async (req, res) => {
  try {
    await chatService.markAllRead(req.userId);
    return res.status(200).json({ message: 'All messages marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ message: 'Internal error marking messages as read.' });
  }
});

router.get('/messages/inbox', verifyToken, async (req, res) => {
  try {
    const threads = await chatService.getInbox(req.userId);
    return res.status(200).json(threads);
  } catch (error) {
    console.error('Inbox retrieval error:', error);
    return res.status(500).json({ message: 'Internal error fetching inbox.' });
  }
});

router.get('/messages/:itemId/:otherUserId', verifyToken, async (req, res) => {
  try {
    const { itemId, otherUserId } = req.params;
    const messages = await chatService.getConversationHistory(req.userId, otherUserId, itemId);
    if (!messages) return res.status(403).json({ message: 'Conversation access denied.' });
    return res.status(200).json(messages);
  } catch (error) {
    console.error('Database message retrieval error:', error);
    return res.status(500).json({ message: 'Internal error fetching chat logs.' });
  }
});

router.get('/items/:itemId/download-pdf', verifyToken, async (req, res) => {
  try {
    const result = await preparePoliceHandover(req.params.itemId, req.userId);
    if (result.error === 'ITEM_NOT_FOUND') return res.status(404).json({ message: 'Item lookup failed' });
    if (result.error === 'USER_NOT_FOUND') return res.status(404).json({ message: 'User verification failed' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Handover_Declaration_${result.itemId}.pdf"`);
    result.document.on('error', error => res.destroy(error));
    return result.document.pipe(res);
  } catch (error) {
    console.error('PDF Generation Service Error:', error);
    return res.status(500).json({ message: 'Engine failure generating official PDF document' });
  }
});

module.exports = router;
