const ReturnRecord = require('../models/ReturnRecord');
const Item = require('../models/Item');
const User = require('../models/User');

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

    // Upsert the Return Record
    let record = await ReturnRecord.findOne({ itemId, ownerId, finderId });
    if (!record) {
      record = new ReturnRecord({
        itemId,
        ownerId,
        finderId,
        status: 'FINDER_CONFIRMED',
        finderConfirmedAt: new Date()
      });
    } else {
      if (!record.finderConfirmedAt) {
        record.finderConfirmedAt = new Date();
        if (record.status !== 'OWNER_FINDER_VERIFIED' && record.status !== 'RETURN_COMPLETED') {
          record.status = 'FINDER_CONFIRMED';
        }
      }
    }

    await record.save();
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

    record.ownerConfirmedAt = new Date();
    record.status = 'OWNER_FINDER_VERIFIED';
    await record.save();

    return res.status(200).json(record);
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

    const record = await ReturnRecord.findOne({ itemId, ownerId, finderId });
    if (!record || record.status !== 'OWNER_FINDER_VERIFIED') {
      return res.status(400).json({ message: 'Mutual verification must be completed first' });
    }

    // Complete the Handover
    record.ownerReceivedAt = new Date();
    record.status = 'RETURN_COMPLETED';
    await record.save();

    // Officially mark the item as Claimed
    item.status = 'Claimed';
    await item.save();

    // Increment Finder's Karma Points (+50)
    const finder = await User.findById(finderId);
    if (finder) {
      finder.karmaPoints = (finder.karmaPoints || 0) + 50;
      await finder.save();
    }

    return res.status(200).json(record);
  } catch (error) {
    console.error('Error in confirmReceipt:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
