const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const owner = '1'.repeat(24), claimant = '2'.repeat(24), stranger = '3'.repeat(24), itemId = '4'.repeat(24);

const setup = (userId) => {
  const events = {}, joined = [], messages = [], broadcasts = [];
  const dependencies = {
    '../models/Item': { findById: () => ({ select: async () => ({ createdBy: owner }) }) },
    '../models/User': { exists: async () => true },
    '../models/Message': { create: async data => { messages.push(data); return data; } },
    '../../business/services/socket.service': { emitGlobalNotification() {} },
  };
  const repositoryContext = { module: { exports: {} }, require: name => dependencies[name] };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../data-access/repositories/chat.repository.js'), 'utf8'), repositoryContext);
  dependencies['../../data-access/repositories/chat.repository'] = repositoryContext.module.exports;
  const context = { module: { exports: {} }, require: name => dependencies[name] };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../business/services/chat.service.js'), 'utf8'), context);
  dependencies['../../business/services/chat.service'] = context.module.exports;
  const handlerContext = { module: { exports: {} }, require: name => dependencies[name] };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../presentation/controllers/chat.socket.js'), 'utf8'), handlerContext);
  const socket = { userId, on: (name, handler) => { events[name] = handler; }, join: async room => joined.push(room), leave() {} };
  handlerContext.module.exports.registerChatHandlers({ to: room => ({ emit: (event, data) => broadcasts.push({ room, event, data }) }) }, socket);
  return { events, joined, messages, broadcasts, room: context.module.exports.roomFor(owner, claimant, itemId) };
};

test('an unrelated user cannot subscribe to another pair\'s room', async () => {
  const { events, joined, room } = setup(stranger);
  let result;
  await events.join_room(room, value => { result = value; });
  assert.equal(result.ok, false);
  assert.equal(joined.length, 0);
});
test('a claimant can open a conversation with the item creator before sending messages', async () => {
  const { events, joined, room } = setup(claimant);
  let result;
  await events.join_room(room, value => { result = value; });
  assert.equal(result.ok, true);
  assert.deepEqual(joined, [room]);
});
test('naming yourself in a room does not authorize an unrelated item conversation', async () => {
  const { events, joined } = setup(stranger);
  let result;
  await events.join_room([claimant, stranger].sort().join('_') + '_' + itemId, value => { result = value; });
  assert.equal(result.ok, false);
  assert.equal(joined.length, 0);
});
test('invalid message payloads never persist or broadcast', async () => {
  const { events, messages, broadcasts } = setup(claimant);
  for (const data of [null, { itemId, receiverId: owner, text: ' ' }, { itemId, receiverId: owner, text: 'x'.repeat(2001) }, { itemId, receiverId: stranger, text: 'hello' }]) {
    let result;
    await events.send_message(data, value => { result = value; });
    assert.equal(result.ok, false);
  }
  assert.equal(messages.length, 0);
  assert.equal(broadcasts.length, 0);
});
test('messages use the authenticated sender rather than a supplied sender ID', async () => {
  const { events, messages } = setup(claimant);
  let result;
  await events.send_message({ itemId, receiverId: owner, senderId: stranger, text: ' hello ' }, value => { result = value; });
  assert.equal(result.ok, true);
  assert.equal(messages[0].senderId, claimant);
  assert.equal(messages[0].text, 'hello');
});
