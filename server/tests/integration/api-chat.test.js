const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { io: connectSocket } = require('socket.io-client');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Item = require('../../models/Item');
const User = require('../../models/User');
const Message = require('../../models/Message');
const ReturnRecord = require('../../models/ReturnRecord');
const { getAllowedOrigins, isAllowedOrigin } = require('../../config/security');
const { authenticateSocket } = require('../../middleware/socket.middleware');
const { registerChatHandlers, roomFor } = require('../../services/chat.service');
const { verifyToken } = require('../../middleware/auth.middleware');
const controller = require('../../controllers/item.controller');
const socketService = require('../../services/socket.service');
let database, server, io, baseURL;
const sockets = [];
const privateValue = 'DEMO-SERIAL-123456789';
const tokenFor = (user, options = {}) => jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '5m', ...options });

before(async () => {
  // Synthetic configuration only: never load .env or a caller-supplied database URI.
  process.env.JWT_SECRET = 'integration-only-signing-secret-01234567890123456789';
  database = await MongoMemoryReplSet.create({ binary: { version: '8.2.6', downloadDir: path.resolve(__dirname, '../../node_modules/.cache/mongodb-memory-server') }, replSet: { count: 1 } });
  await mongoose.connect(database.getUri(), { dbName: 'api_chat_tests' });
  await Promise.all([Item.init(), User.init(), Message.init(), ReturnRecord.init()]);
  const app = express();
  const origins = getAllowedOrigins({ NODE_ENV: 'production', CLIENT_URL: 'https://frontend.example' });
  app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin, origins)) }));
  app.use(express.json());
  app.get('/api/items/:itemId', controller.getItemById);
  app.post('/api/items/:itemId/verify-ownership', verifyToken, controller.verifyOwnership);
  app.use('/api/handovers', require('../../routes/handover.routes'));
  app.use('/api', require('../../routes/api.routes'));
  server = http.createServer(app);
  io = new Server(server, { allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin, origins)) });
  io.use(authenticateSocket);
  io.on('connection', socket => registerChatHandlers(io, socket));
  socketService.setIo(io);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  sockets.forEach(socket => socket.disconnect());
  if (io) await new Promise(resolve => io.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
});
beforeEach(async () => {
  sockets.splice(0).forEach(socket => socket.disconnect());
  await Promise.all([Item.deleteMany({}), User.deleteMany({}), Message.deleteMany({}), ReturnRecord.deleteMany({})]);
});

const fixture = async () => {
  const [owner, claimant, stranger] = await User.create([{ username: 'owner' }, { username: 'claimant' }, { username: 'stranger' }]);
  const item = await Item.create({ title: 'Test phone', description: 'Disposable report', type: 'LOST', category: 'Electronics', date: new Date(), province: 'Western', district: 'Colombo', city: 'Colombo', contactNumber: '0000000000', createdBy: owner._id, ownershipProofs: [{ proofType: 'serialNumber', proofValue: privateValue }, { proofType: 'custom', customLabel: 'Receipt code', proofValue: 'PRIVATE-RECEIPT-42' }] });
  return { owner, claimant, stranger, item };
};
const request = async (url, { token, body, headers = {}, method = 'GET' } = {}) => {
  const response = await fetch(baseURL + url, { method, headers: { 'Content-Type': 'application/json', ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { code: response.status, body: await response.json(), headers: response.headers };
};
const socketFor = (token, origin) => new Promise((resolve, reject) => {
  const socket = connectSocket(baseURL, { auth: { token }, transports: ['websocket'], reconnection: false, timeout: 3000, extraHeaders: origin ? { Origin: origin } : {} });
  sockets.push(socket);
  socket.once('connect', () => resolve(socket));
  socket.once('connect_error', reject);
});
const emit = (socket, event, data) => new Promise((resolve, reject) => socket.timeout(3000).emit(event, data, (error, response) => error ? reject(error) : resolve(response)));

test('the receipt endpoint enforces the owner role and returns the completed record on retry', async () => {
  const { item, owner, claimant } = await fixture();
  const record = await ReturnRecord.create({
    itemId: item._id, ownerId: owner._id, finderId: claimant._id, status: 'OWNER_FINDER_VERIFIED',
  });
  const confirm = (actor, counterpart) => request(
    `/api/handovers/${item._id}/${counterpart._id}/confirm-receipt`,
    { method: 'POST', token: tokenFor(actor) }
  );
  assert.equal((await confirm(claimant, owner)).code, 403);
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await confirm(owner, claimant);
    assert.equal(response.code, 200);
    assert.equal(response.body._id, record._id.toString());
    assert.equal(response.body.status, 'RETURN_COMPLETED');
  }
  assert.equal((await User.findById(claimant._id)).karmaPoints, 50);
});

test('MongoDB projections hide values by default and preserve custom labels for explicit selection', async () => {
  const { item } = await fixture();
  assert.equal((await Item.findById(item._id)).ownershipProofs, undefined);
  const selected = await Item.findById(item._id).select('+ownershipProofs');
  assert.equal(selected.ownershipProofs[0].proofValue, privateValue);
  assert.equal(selected.ownershipProofs[1].customLabel, 'Receipt code');
});
test('real HTTP item responses expose only labels to non-owners', async () => {
  const { item, owner, claimant } = await fixture();
  for (const token of [undefined, tokenFor(claimant)]) {
    const response = await request(`/api/items/${item._id}`, { token });
    assert.equal(response.code, 200);
    assert.equal(response.body.ownershipProofs[0].proofType, 'serialNumber');
    assert.equal(JSON.stringify(response.body).includes(privateValue), false);
  }
  const response = await request(`/api/items/${item._id}`, { token: tokenFor(owner) });
  assert.equal(response.body.ownershipProofs[0].proofValue, privateValue);
});
test('HTTP verification persists real history without leaking values to messages', async () => {
  const { item, claimant } = await fixture();
  const response = await request(`/api/items/${item._id}/verify-ownership`, { method: 'POST', token: tokenFor(claimant), body: { submittedProofs: [{ proofType: 'serialNumber', proofValue: privateValue }] } });
  assert.equal(response.code, 200);
  assert.equal(response.body.status, 'PARTIALLY_VERIFIED');
  assert.equal(response.body.verifiedCount, 1);
  assert.equal((await Item.findById(item._id)).verificationHistory[0].scorePercentage, 50);
  assert.equal(JSON.stringify(await Message.find({}).lean()).includes(privateValue), false);
});
test('identifier near-matches and malformed inputs cannot verify', async () => {
  const { item, claimant } = await fixture();
  const url = `/api/items/${item._id}/verify-ownership`;
  const response = await request(url, { method: 'POST', token: tokenFor(claimant), body: { submittedProofs: [{ proofType: 'serialNumber', proofValue: privateValue.slice(0, -1) }] } });
  assert.equal(response.body.status, 'NOT_VERIFIED');
  const invalid = await request(url, { method: 'POST', token: tokenFor(claimant), body: { submittedProofs: [null] } });
  assert.equal(invalid.code, 400);
});
test('expired and incorrectly signed JWTs fail HTTP authentication', async () => {
  const { item, claimant } = await fixture();
  for (const token of [tokenFor(claimant, { expiresIn: -1 }), jwt.sign({ id: claimant._id }, 'wrong-secret')]) {
    const response = await request(`/api/items/${item._id}/verify-ownership`, { method: 'POST', token, body: { submittedProofs: [] } });
    assert.equal(response.code, 401);
  }
});
test('HTTP CORS does not authorize unlisted preview origins', async () => {
  const { item } = await fixture();
  const allowed = await request(`/api/items/${item._id}`, { headers: { Origin: 'https://frontend.example' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://frontend.example');
  const rejected = await request(`/api/items/${item._id}`, { headers: { Origin: 'https://unrelated.vercel.app' } });
  assert.equal(rejected.headers.get('access-control-allow-origin'), null);
});
test('actual Socket.IO connections enforce authentication and room membership', async () => {
  const { owner, claimant, stranger, item } = await fixture();
  await assert.rejects(socketFor(tokenFor(claimant, { expiresIn: -1 })));
  const ownerSocket = await socketFor(tokenFor(owner));
  const claimantSocket = await socketFor(tokenFor(claimant));
  const strangerSocket = await socketFor(tokenFor(stranger));
  const room = roomFor(owner._id.toString(), claimant._id.toString(), item._id.toString());
  assert.equal((await emit(ownerSocket, 'join_room', room)).ok, true);
  assert.equal((await emit(claimantSocket, 'join_room', room)).ok, true);
  assert.equal((await emit(strangerSocket, 'join_room', room)).ok, false);
  const received = new Promise(resolve => ownerSocket.once('receive_message', resolve));
  const sent = await emit(claimantSocket, 'send_message', { itemId: item._id.toString(), receiverId: owner._id.toString(), text: 'Test message', senderId: stranger._id.toString() });
  assert.equal(sent.ok, true);
  assert.equal((await received).senderId, claimant._id.toString());
  assert.equal((await Message.findOne({ text: 'Test message' })).senderId.toString(), claimant._id.toString());
});

test('websocket handshakes reject an unlisted origin and tokens for deleted users', async () => {
  const { claimant } = await fixture();
  await assert.rejects(socketFor(tokenFor(claimant), 'https://unrelated.vercel.app'));
  const token = tokenFor(claimant);
  await User.deleteOne({ _id: claimant._id });
  await assert.rejects(socketFor(token));
});
test('an unrelated user cannot read a different pair\'s HTTP chat history', async () => {
  const { item, claimant, stranger } = await fixture();
  const response = await request(`/api/messages/${item._id}/${claimant._id}`, { token: tokenFor(stranger) });
  assert.equal(response.code, 403);
});
