const { scoreProof } = require('../../utils/ownershipProofs');
const { findItemWithProofs, saveVerification } = require('../../data-access/repositories/ownership.repository');
const { findUsername, createMessage } = require('../../data-access/repositories/chat.repository');
const { emitGlobalNotification } = require('./socket.service');

const verifyOwnership = async ({ itemId, verifierId, submittedProofs }) => {
  const item = await findItemWithProofs(itemId);
  if (!item) return { error: 'ITEM_NOT_FOUND' };

  const storedProofs = item.ownershipProofs || [];
  const totalProofs = storedProofs.length;
  if (!totalProofs) return { error: 'NO_REGISTERED_PROOFS' };

  const verifiedCount = storedProofs.filter(stored =>
    submittedProofs.some(submitted => scoreProof(stored, submitted) >= 0.8)
  ).length;
  const scorePercentage = Math.round((verifiedCount / totalProofs) * 100);

  let overallStatus = 'NOT_VERIFIED';
  if (scorePercentage === 100) overallStatus = 'VERIFIED';
  else if (scorePercentage >= 50) overallStatus = 'PARTIALLY_VERIFIED';

  item.verificationHistory.push({
    verifierId, verifyingType: 'CLAIM_VERIFICATION', overallStatus,
    scorePercentage, verifiedCount, totalProofs, timestamp: new Date(),
  });
  if (overallStatus !== 'NOT_VERIFIED' && item.status === 'Available') {
    item.status = 'Pending Verification';
  }
  await saveVerification(item);

  const receiverId = item.createdBy.toString();
  if (verifierId !== receiverId) {
    // Notification failure does not undo an already persisted verification.
    try {
      const verifierName = await findUsername(verifierId) || 'A claimant';
      const message = await createMessage({
        itemId: item._id,
        senderId: verifierId,
        receiverId,
        text: `🤖 DIGITAL OWNERSHIP VERIFICATION RESULT:\nUser @${verifierName} has completed verification.\nMatch Result: ${overallStatus} (${scorePercentage}% score)\nVerified fields: ${verifiedCount} of ${totalProofs}.`,
      });
      emitGlobalNotification(receiverId, message);
      emitGlobalNotification(verifierId, message);
    } catch (error) {
      console.error('Failed to send verification system message:', error);
    }
  }

  return { success: true, status: overallStatus, scorePercentage, verifiedCount, totalProofs };
};

module.exports = { verifyOwnership };
