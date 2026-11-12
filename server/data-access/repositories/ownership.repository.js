const Item = require('../models/Item');

// Proof values are excluded by default and are needed for comparison here.
const findItemWithProofs = itemId => Item.findById(itemId).select('+ownershipProofs');
const saveVerification = item => item.save();

module.exports = { findItemWithProofs, saveVerification };
