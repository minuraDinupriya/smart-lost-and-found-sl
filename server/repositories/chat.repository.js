const Item = require('../models/Item');
const User = require('../models/User');
const Message = require('../models/Message');

const findItemCreator = async itemId => {
  const item = await Item.findById(itemId).select('createdBy');
  return item?.createdBy.toString();
};
const userExists = userId => User.exists({ _id: userId });
const findUsername = async userId => (await User.findById(userId))?.username;
const createMessage = data => Message.create(data);

const markConversationRead = (itemId, senderId, receiverId) => Message.updateMany(
  { itemId, senderId, receiverId, isRead: false },
  { $set: { isRead: true } }
);

const findConversation = (itemId, userId, otherUserId) => Message.find({
  itemId,
  $or: [
    { senderId: userId, receiverId: otherUserId },
    { senderId: otherUserId, receiverId: userId },
  ],
}).sort({ createdAt: 1 })
  .populate('senderId', 'username profilePicture')
  .populate('receiverId', 'username profilePicture');

module.exports = {
  findItemCreator, userExists, findUsername, createMessage, markConversationRead, findConversation,
};
