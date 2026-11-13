const ReturnRecord = require('../models/ReturnRecord');

const findReturns = async (participantField, userId, counterpartField) => {
  const records = await ReturnRecord.find({ [participantField]: userId })
    .populate('itemId', 'title imageUrl type category')
    .populate(counterpartField, 'username email')
    .sort({ createdAt: -1 });
  return records.map(record => record.toObject());
};

const findOwnerReturns = userId => findReturns('ownerId', userId, 'finderId');
const findFinderReturns = userId => findReturns('finderId', userId, 'ownerId');

module.exports = { findOwnerReturns, findFinderReturns };
