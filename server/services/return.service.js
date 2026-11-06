const mongoose = require('mongoose');
const Item = require('../models/Item');
const User = require('../models/User');
const ReturnRecord = require('../models/ReturnRecord');

const fail = (status, message) => Object.assign(new Error(message), { status });

const claimDirect = async (itemId, creatorId) => mongoose.connection.transaction(async session => {
  const item = await Item.findById(itemId).session(session);
  if (!item) throw fail(404, 'Item not found.');
  if (item.createdBy.toString() !== creatorId) throw fail(403, 'Unauthorized to claim this item.');
  if (item.status === 'Claimed') return item;

  item.status = 'Claimed';
  await item.save({ session });
  if (item.type === 'FOUND') {
    const finder = await User.findByIdAndUpdate(creatorId, { $inc: { karmaPoints: 50 } }, { session });
    if (!finder) throw fail(404, 'Finder not found.');
  }
  return item;
});

const completeReturn = async ({ itemId, ownerId, finderId }) => mongoose.connection.transaction(async session => {
  const record = await ReturnRecord.findOne({ itemId, ownerId, finderId }).session(session);
  if (!record) throw fail(400, 'Mutual verification must be completed first.');
  if (record.status === 'RETURN_COMPLETED') return record;
  if (record.status !== 'OWNER_FINDER_VERIFIED') throw fail(400, 'Mutual verification must be completed first.');

  // The item is the shared contention point for direct claims and all candidate handovers.
  const item = await Item.findOneAndUpdate(
    { _id: itemId, status: { $ne: 'Claimed' } },
    { $set: { status: 'Claimed' } },
    { new: true, session }
  );
  if (!item) throw fail(409, 'This item has already been returned through another flow.');

  const finder = await User.findByIdAndUpdate(finderId, { $inc: { karmaPoints: 50 } }, { session });
  if (!finder) throw fail(404, 'Finder not found.');
  record.status = 'RETURN_COMPLETED';
  record.ownerReceivedAt = new Date();
  await record.save({ session });
  return record;
});

module.exports = { claimDirect, completeReturn };
