const { findItem, withReturnTransaction } = require('../../data-access/repositories/return.repository');

const fail = (status, message) => Object.assign(new Error(message), { status });

const resolveRoles = (item, currentUserId, otherUserId) => {
  const creatorId = item.createdBy.toString();
  const counterpartId = creatorId === currentUserId ? otherUserId : currentUserId;
  return item.type === 'LOST'
    ? { ownerId: creatorId, finderId: counterpartId }
    : { ownerId: counterpartId, finderId: creatorId };
};

const claimDirect = async (itemId, creatorId) => withReturnTransaction(async store => {
  const item = await store.findItem(itemId);
  if (!item) throw fail(404, 'Item not found.');
  if (item.createdBy.toString() !== creatorId) throw fail(403, 'Unauthorized to claim this item.');
  if (item.status === 'Claimed') return item;

  item.status = 'Claimed';
  await store.saveItem(item);
  if (item.type === 'FOUND') {
    const finder = await store.addKarma(creatorId, 50);
    if (!finder) throw fail(404, 'Finder not found.');
  }
  return item;
});

const completeReturn = async ({ itemId, ownerId, finderId }) => withReturnTransaction(async store => {
  const record = await store.findRecord({ itemId, ownerId, finderId });
  if (!record) throw fail(400, 'Mutual verification must be completed first.');
  if (record.status === 'RETURN_COMPLETED') return record;
  if (record.status !== 'OWNER_FINDER_VERIFIED') throw fail(400, 'Mutual verification must be completed first.');

  const item = await store.claimAvailableItem(itemId);
  if (!item) throw fail(409, 'This item has already been returned through another flow.');

  const finder = await store.addKarma(finderId, 50);
  if (!finder) throw fail(404, 'Finder not found.');
  record.status = 'RETURN_COMPLETED';
  record.ownerReceivedAt = new Date();
  await store.saveRecord(record);
  return record;
});

const confirmReceipt = async ({ itemId, currentUserId, otherUserId }) => {
  const item = await findItem(itemId);
  if (!item) throw fail(404, 'Item not found');

  const { ownerId, finderId } = resolveRoles(item, currentUserId, otherUserId);
  if (currentUserId !== ownerId) throw fail(403, 'Only the rightful owner can confirm receipt');

  return completeReturn({ itemId, ownerId, finderId });
};

module.exports = { claimDirect, completeReturn, confirmReceipt, resolveRoles };
