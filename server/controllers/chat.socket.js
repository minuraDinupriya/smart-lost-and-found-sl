const { roomFor, authorizeConversation, sendMessage } = require('../services/chat.service');
const socketService = require('../services/socket.service');

const registerChatHandlers = (io, socket) => {
  socket.on('join_room', async (roomId, ack) => {
    const respond = result => { if (typeof ack === 'function') ack(result); };
    try {
      const parts = typeof roomId === 'string' ? roomId.split('_') : [];
      const [first, second, itemId] = parts;
      if (parts.length !== 3 || ![first, second].includes(socket.userId) || roomId !== roomFor(first, second, itemId)) {
        return respond({ ok: false, message: 'Conversation access denied.' });
      }
      const otherUserId = first === socket.userId ? second : first;
      if (!await authorizeConversation(socket.userId, otherUserId, itemId)) return respond({ ok: false, message: 'Conversation access denied.' });
      await socket.join(roomId);
      respond({ ok: true });
    } catch {
      respond({ ok: false, message: 'Unable to join conversation.' });
    }
  });

  socket.on('leave_room', roomId => {
    if (typeof roomId === 'string') socket.leave(roomId);
  });

  socket.on('send_message', async (data, ack) => {
    const respond = result => { if (typeof ack === 'function') ack(result); };
    try {
      const { itemId, receiverId, text } = data || {};
      if (typeof text !== 'string' || !text.trim() || text.length > 2000) return respond({ ok: false, message: 'Message must contain 1–2000 characters.' });

      // Sender identity always comes from the authenticated connection.
      const saved = await sendMessage({ itemId, senderId: socket.userId, receiverId, text: text.trim() });
      if (!saved) return respond({ ok: false, message: 'Conversation access denied.' });
      io.to(roomFor(socket.userId, receiverId, itemId)).emit('receive_message', saved);
      socketService.emitGlobalNotification(receiverId, saved);
      respond({ ok: true, message: saved });
    } catch {
      respond({ ok: false, message: 'Unable to send message.' });
    }
  });
};

module.exports = { registerChatHandlers };
