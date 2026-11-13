const ReturnRecord = require('../models/ReturnRecord');
const Tip = require('../models/Tip');

const findReturnWithItem = id => ReturnRecord.findById(id).populate('itemId');
const findReturnWithParticipants = async id => {
  const record = await findReturnWithItem(id)
    .populate('ownerId', 'username')
    .populate('finderId', 'username');
  return record?.toObject();
};

const findTipByReturnRecordId = returnRecordId => Tip.findOne({ returnRecordId });
const findPaidTipByReturnRecordId = returnRecordId => Tip.findOne({ returnRecordId, paymentStatus: 'paid' });
const findSettledTipByReturnRecordId = returnRecordId => Tip.findOne({
  returnRecordId, paymentStatus: { $in: ['paid', 'completed'] },
});
const findTipsByReturnRecordIds = ids => Tip.find({ returnRecordId: { $in: ids } });
const findTipByPaymentReference = paymentReference => Tip.findOne({ paymentReference });
const findPendingPaidTips = finderId => Tip.find({ finderId, paymentStatus: 'paid', payoutStatus: 'pending' });

const findTipWithParticipants = id => Tip.findById(id)
  .populate('ownerId', 'username')
  .populate('finderId', 'username')
  .populate({
    path: 'returnRecordId',
    populate: { path: 'itemId', select: 'title imageUrl' },
  });

const findPaidTips = (participantField, userId, counterpartField) => Tip.find({
  [participantField]: userId, paymentStatus: 'paid',
})
  .populate(counterpartField, 'username')
  .populate({
    path: 'returnRecordId',
    populate: { path: 'itemId', select: 'title imageUrl type' },
  })
  .sort({ createdAt: -1 });

const findSentTips = userId => findPaidTips('ownerId', userId, 'finderId');
const findReceivedTips = userId => findPaidTips('finderId', userId, 'ownerId');
const createTip = data => Tip.create(data);
const saveTip = tip => tip.save();

module.exports = {
  findReturnWithItem, findReturnWithParticipants, findTipByReturnRecordId,
  findPaidTipByReturnRecordId, findSettledTipByReturnRecordId, findTipsByReturnRecordIds,
  findTipByPaymentReference, findPendingPaidTips, findTipWithParticipants, findSentTips,
  findReceivedTips, createTip, saveTip,
};
