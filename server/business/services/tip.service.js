const repository = require('../../data-access/repositories/tip.repository');
const { findUserById, userExists } = require('../../data-access/repositories/user.repository');
const { notifyUser } = require('./notification.service');
const paymentService = require('../../data-access/integrations/payment-gateway');

class TipError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const participantId = participant => (participant?._id ?? participant)?.toString();
const isParticipant = (record, userId) =>
  participantId(record.ownerId) === userId || participantId(record.finderId) === userId;

const getIneligibilityReason = async (record, userId) => {
  if (!record.itemId) return 'Associated item not found.';

  const ownerId = participantId(record.ownerId);
  const finderId = participantId(record.finderId);
  if (ownerId !== userId) return 'Only the rightful owner can give a tip.';
  if (ownerId === finderId) return 'You cannot give a tip to yourself.';
  if (!finderId || !await userExists(finderId)) return 'The finder user does not exist.';

  // Completed and Returned are statuses used by older handover records.
  if (!['RETURN_COMPLETED', 'Returned', 'Completed'].includes(record.status)) {
    return 'Handover status is not completed.';
  }
  if (record.status === 'RETURN_COMPLETED' &&
      (!record.finderConfirmedAt || !record.ownerConfirmedAt || !record.ownerReceivedAt)) {
    return 'Mutual verification steps are incomplete. Both parties must confirm.';
  }
  if (record.itemId.status !== 'Claimed') return 'The item has not been marked as Claimed/Returned.';
  if (await repository.findSettledTipByReturnRecordId(record._id)) {
    return 'A tip has already been paid for this return.';
  }
  return '';
};

const getEligibleReturn = async (returnRecordId, userId) => {
  const record = await repository.findReturnWithItem(returnRecordId);
  if (!record) throw new TipError(404, 'Return record not found.');

  const reason = await getIneligibilityReason(record, userId);
  if (reason) throw new TipError(400, reason);
  return record;
};

const saveTipForReturn = async (record, fields) => {
  const tip = await repository.findTipByReturnRecordId(record._id);
  if (!tip) return repository.createTip({
    returnRecordId: record._id, ownerId: record.ownerId, finderId: record.finderId, ...fields,
  });

  Object.assign(tip, fields);
  return repository.saveTip(tip);
};

const createTip = async ({ returnRecordId, userId, amount, thankYouMessage, hostUrl }) => {
  const record = await getEligibleReturn(returnRecordId, userId);
  const tip = await saveTipForReturn(record, { amount, thankYouMessage, paymentStatus: 'pending', paymentReference: '' });
  const paymentSession = await paymentService.createCheckoutSession(tip, hostUrl);

  tip.paymentReference = paymentSession.reference;
  await repository.saveTip(tip);
  return { tip, checkoutUrl: paymentSession.url, isMock: paymentSession.isMock };
};

const getTipById = async (id, userId) => {
  const tip = await repository.findTipWithParticipants(id);
  if (!tip) throw new TipError(404, 'Tip record not found.');
  if (!isParticipant(tip, userId)) throw new TipError(403, 'Unauthorized to view this tip details.');
  return tip;
};

const getUserTips = async (userId, currentUserId) => {
  if (userId !== currentUserId) throw new TipError(403, "Unauthorized to access this user's tip logs.");
  const [sent, received] = await Promise.all([
    repository.findSentTips(userId), repository.findReceivedTips(userId),
  ]);
  return { sent, received };
};

const settlePaidTip = async tip => {
  tip.paymentStatus = 'paid';
  await repository.saveTip(tip);

  const [owner, finder, record] = await Promise.all([
    findUserById(tip.ownerId), findUserById(tip.finderId), repository.findReturnWithItem(tip.returnRecordId),
  ]);
  const itemTitle = record?.itemId?.title || 'Returned Item';
  const ownerName = owner?.username || 'Owner';
  let finderMessage;
  if (finder?.bankDetails?.accountNumber) {
    const payout = await paymentService.initiatePayout(tip, finder);
    if (payout.status === 'completed') {
      tip.payoutStatus = 'completed';
      finderMessage = `🎉 You received a reward of Rs. ${tip.amount} from @${ownerName} for "${itemTitle}"! The money has been transferred to your bank account.`;
    } else {
      tip.payoutStatus = 'pending';
      finderMessage = `🎉 You received a reward of Rs. ${tip.amount} from @${ownerName}! We had trouble transferring it to your bank. Please check your bank details in your profile.`;
    }
  } else {
    tip.payoutStatus = 'pending';
    finderMessage = `🎉 You received a reward of Rs. ${tip.amount} from @${ownerName} for "${itemTitle}"! Please add your bank details in your Profile to receive the money.`;
  }

  await repository.saveTip(tip);
  await notifyUser({ userId: tip.finderId, message: finderMessage, type: 'TIP_RECEIVED' });

  const ownerMessage = `Your reward tip of Rs. ${tip.amount} to @${finder?.username || 'Finder'} for "${itemTitle}" was sent successfully.`;
  await notifyUser({ userId: tip.ownerId, message: ownerMessage, type: 'TIP_SENT' });
};

const updateTipPaymentStatus = async paymentReference => {
  const tip = await repository.findTipByPaymentReference(paymentReference);
  if (!tip) throw new TipError(404, 'Tip record not found for this reference.');
  if (tip.paymentStatus === 'paid') return { outcome: 'already_paid', tip };

  const verification = await paymentService.verifyPayment(paymentReference);
  if (verification.status === 'paid') {
    await settlePaidTip(tip);
    return { outcome: 'paid', tip };
  }
  if (verification.status === 'failed') {
    tip.paymentStatus = 'failed';
    await repository.saveTip(tip);
    return { outcome: 'failed', tip };
  }
  return { outcome: 'pending', tip };
};

const getReturnRecordById = async (id, userId) => {
  const record = await repository.findReturnWithParticipants(id);
  if (!record) throw new TipError(404, 'Return record not found.');
  if (!isParticipant(record, userId)) throw new TipError(403, 'Unauthorized to view this return record.');

  const ineligibilityReason = await getIneligibilityReason(record, userId);
  return { ...record, isEligible: !ineligibilityReason, ineligibilityReason };
};

const skipTip = async (returnRecordId, userId) => {
  const record = await getEligibleReturn(returnRecordId, userId);
  return saveTipForReturn(record, { amount: 0, paymentStatus: 'skipped' });
};

module.exports = { TipError, createTip, getTipById, getUserTips, updateTipPaymentStatus, getReturnRecordById, skipTip };
