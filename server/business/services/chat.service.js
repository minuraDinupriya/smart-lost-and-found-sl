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

module.exports = { validId, roomFor, authorizeConversation, getConversationHistory, sendMessage };
