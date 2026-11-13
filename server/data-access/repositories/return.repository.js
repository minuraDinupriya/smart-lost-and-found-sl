const mongoose = require('mongoose');
const Item = require('../models/Item');
const User = require('../models/User');
const ReturnRecord = require('../models/ReturnRecord');

const findItem = itemId => Item.findById(itemId);
const findRecord = participants => ReturnRecord.findOne(participants);
const findReturnRecordForItem = itemId => ReturnRecord.findOne({ itemId })
  .populate('ownerId', 'username')
  .populate('finderId', 'username');

const recordFinderConfirmation = async (participants, confirmedAt) => {
  try {
    return await ReturnRecord.findOneAndUpdate(
      participants,
      { $setOnInsert: { status: 'FINDER_CONFIRMED', finderConfirmedAt: confirmedAt } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    return findRecord(participants);
  }
};

const recordOwnerConfirmation = async (recordId, confirmedAt) => {
  // Only the initial owner confirmation may advance the state.
  const confirmed = await ReturnRecord.findOneAndUpdate(
    { _id: recordId, status: 'FINDER_CONFIRMED' },
    { $set: { ownerConfirmedAt: confirmedAt, status: 'OWNER_FINDER_VERIFIED' } },
    { new: true }
  );
  return confirmed || ReturnRecord.findById(recordId);
};

const withReturnTransaction = work => mongoose.connection.transaction(session => work({
  findItem: itemId => findItem(itemId).session(session),
  findRecord: participants => findRecord(participants).session(session),
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

module.exports = {
  findItem, findRecord, findReturnRecordForItem, recordFinderConfirmation, recordOwnerConfirmation,
  withReturnTransaction,
};
