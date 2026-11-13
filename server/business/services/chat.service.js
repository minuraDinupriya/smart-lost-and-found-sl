const chatRepository = require('../../data-access/repositories/chat.repository');

const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);
const roomFor = (first, second, itemId) => [first, second].sort().join('_') + '_' + itemId;

const authorizeConversation = async (userId, otherUserId, itemId) => {
  if (![userId, otherUserId, itemId].every(validId) || userId === otherUserId) return false;
  const creatorId = await chatRepository.findItemCreator(itemId);
  if (![userId, otherUserId].includes(creatorId)) return false;
  return Boolean(await chatRepository.userExists(otherUserId));
};

const getConversationHistory = async (userId, otherUserId, itemId) => {
  if (!await authorizeConversation(userId, otherUserId, itemId)) return null;
  await chatRepository.markConversationRead(itemId, otherUserId, userId);
  return chatRepository.findConversation(itemId, userId, otherUserId);
};

const sendMessage = async ({ itemId, senderId, receiverId, text }) => {
  if (!await authorizeConversation(senderId, receiverId, itemId)) return null;
  return chatRepository.createMessage({ itemId, senderId, receiverId, text });
};

const getInbox = async userId => {
  const messages = await chatRepository.findInboxMessages(userId);
  const latestByItem = new Map();
  for (const message of messages) {
    if (!message.itemId) continue;
    const itemId = message.itemId._id.toString();
    if (!latestByItem.has(itemId)) latestByItem.set(itemId, message);
  }
  return [...latestByItem.values()];
};

module.exports = {
  validId, roomFor, authorizeConversation, getConversationHistory, sendMessage, getInbox,
  countUnread: chatRepository.countUnread, markAllRead: chatRepository.markAllRead,
};
