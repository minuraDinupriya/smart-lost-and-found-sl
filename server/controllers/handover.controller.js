const ReturnRecord = require('../models/ReturnRecord');
const Item = require('../models/Item');

// Helper to reliably determine owner and finder based on the item type
const resolveRoles = (item, currentUserId, otherUserId) => {
  const creatorId = item.createdBy.toString();
  const isLost = item.type === 'LOST';

  let ownerId, finderId;
  
  if (isLost) {
    ownerId = creatorId;
    // The other person in the chat must be the finder
    finderId = creatorId === currentUserId ? otherUserId : currentUserId;
  } else {
    // If it's a FOUND item, the creator is the finder
    finderId = creatorId;
    ownerId = creatorId === currentUserId ? otherUserId : currentUserId;
  }

  return { ownerId, finderId };
};

// @route   GET /api/handovers/:itemId/:otherUserId
// @desc    Get current handover state for a chat
// @access  Private
exports.getHandoverState = async (req, res) => {
  try {
    const { itemId, otherUserId } = req.params;
    const currentUserId = req.userId;

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const { ownerId, finderId } = resolveRoles(item, currentUserId, otherUserId);

    let record = await ReturnRecord.findOne({ itemId, ownerId, finderId });
    
    return res.status(200).json({ 
      record: record || null, 
      isOwner: currentUserId === ownerId,
      isFinder: currentUserId === finderId 
    });

  } catch (error) {
    console.error('Error fetching handover state:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /api/handovers/:itemId/:otherUserId/confirm-finder
// @desc    Finder confirms they found the item
// @access  Private
exports.confirmFinder = async (req, res) => {
  try {
    const { itemId, otherUserId } = req.params;
    const currentUserId = req.userId;

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const { ownerId, finderId } = resolveRoles(item, currentUserId, otherUserId);

    if (currentUserId !== finderId) {
      return res.status(403).json({ message: 'Only the finder can perform this action' });
    }

    let record;
    try {
      record = await ReturnRecord.findOneAndUpdate(
        { itemId, ownerId, finderId },
        { $setOnInsert: { status: 'FINDER_CONFIRMED', finderConfirmedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      record = await ReturnRecord.findOne({ itemId, ownerId, finderId });
    }
    return res.status(200).json(record);
  } catch (error) {
    console.error('Error in confirmFinder:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /api/handovers/:itemId/:otherUserId/confirm-owner
// @desc    Owner confirms the finder is returning their item
// @access  Private
exports.confirmOwner = async (req, res) => {
  try {
    const { itemId, otherUserId } = req.params;
    const currentUserId = req.userId;

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const { ownerId, finderId } = resolveRoles(item, currentUserId, otherUserId);

    if (currentUserId !== ownerId) {
      return res.status(403).json({ message: 'Only the rightful owner can perform this action' });
    }

    const record = await ReturnRecord.findOne({ itemId, ownerId, finderId });
    if (!record || !record.finderConfirmedAt) {
      return res.status(400).json({ message: 'Finder must confirm first' });
    }

    // Repeated owner confirmation cannot reset a completed return.
    const confirmed = await ReturnRecord.findOneAndUpdate(
      { _id: record._id, status: 'FINDER_CONFIRMED' },
      { $set: { ownerConfirmedAt: new Date(), status: 'OWNER_FINDER_VERIFIED' } },
      { new: true }
    );
    return res.status(200).json(confirmed || await ReturnRecord.findById(record._id));

  } catch (error) {
    console.error('Error in confirmOwner:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /api/handovers/:itemId/:otherUserId/confirm-receipt
// @desc    Owner confirms they received the item physically
// @access  Private
exports.confirmReceipt = async (req, res) => {
  try {
    const { itemId, otherUserId } = req.params;
    const currentUserId = req.userId;

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const { ownerId, finderId } = resolveRoles(item, currentUserId, otherUserId);

    if (currentUserId !== ownerId) {
      return res.status(403).json({ message: 'Only the rightful owner can confirm receipt' });
    }

    const { completeReturn } = require('../services/return.service');
    const record = await completeReturn({ itemId, ownerId, finderId });

    return res.status(200).json(record);
  } catch (error) {
    console.error('Error in confirmReceipt:', error);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Server error' });
  }
};
