const mongoose = require('mongoose');
const Item = require('../models/Item');
const User = require('../models/User');
const ReturnRecord = require('../models/ReturnRecord');

const findItem = itemId => Item.findById(itemId);

const withReturnTransaction = work => mongoose.connection.transaction(session => work({
  findItem: itemId => findItem(itemId).session(session),
  findRecord: participants => ReturnRecord.findOne(participants).session(session),
  saveItem: item => item.save({ session }),
  saveRecord: record => record.save({ session }),
  // Direct claims and handovers contend on the same item document.
  claimAvailableItem: itemId => Item.findOneAndUpdate(
    { _id: itemId, status: { $ne: 'Claimed' } },
    { $set: { status: 'Claimed' } },
    { new: true, session }
  ),
  addKarma: (userId, points) => User.findByIdAndUpdate(
    userId, { $inc: { karmaPoints: points } }, { session }
  ),
}));

module.exports = { findItem, withReturnTransaction };
