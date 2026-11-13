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
const Item = require('../../data-access/models/Item');
const User = require('../../data-access/models/User');
const Message = require('../../data-access/models/Message');
const ReturnRecord = require('../../data-access/models/ReturnRecord');
const Notification = require('../../data-access/models/Notification');
const Tip = require('../../data-access/models/Tip');
const { getAllowedOrigins, isAllowedOrigin } = require('../../config/security');
const { authenticateSocket } = require('../../presentation/middleware/socket.middleware');
const { registerChatHandlers } = require('../../presentation/controllers/chat.socket');
const { roomFor } = require('../../business/services/chat.service');
const socketService = require('../../business/services/socket.service');
let database, server, io, baseURL;
const sockets = [];
const privateValue = 'DEMO-SERIAL-123456789';
const tokenFor = (user, options = {}) => jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '5m', ...options });

before(async () => {
  // Synthetic configuration only: never load .env or a caller-supplied database URI.
  process.env.JWT_SECRET = 'integration-only-signing-secret-01234567890123456789';
  database = await MongoMemoryReplSet.create({ binary: { version: '8.2.6', downloadDir: path.resolve(__dirname, '../../node_modules/.cache/mongodb-memory-server') }, replSet: { count: 1 } });
  await mongoose.connect(database.getUri(), { dbName: 'api_chat_tests' });
  const models = [Item, User, Message, ReturnRecord, Notification, Tip];
  await Promise.all(models.map(model => model.init()));
  const app = express();
  const origins = getAllowedOrigins({ NODE_ENV: 'production', CLIENT_URL: 'https://frontend.example' });
  app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin, origins)) }));
  app.use(express.json());
  app.use('/api/items', require('../../presentation/routes/item.routes'));
  app.use('/api/handovers', require('../../presentation/routes/handover.routes'));
  app.use('/api/auth', require('../../presentation/routes/auth.routes'));
  app.use('/api/admin', require('../../presentation/routes/admin.routes'));
  app.use('/api/notifications', require('../../presentation/routes/notification.routes'));
  app.use('/api/history', require('../../presentation/routes/history.routes'));
  app.use('/api/tips', require('../../presentation/routes/tip.routes'));
  app.use('/api', require('../../presentation/routes/api.routes'));
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
  await Promise.all([Item, User, Message, ReturnRecord, Notification, Tip].map(model => model.deleteMany({})));
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

test('chat history returns the participants’ messages and marks incoming messages read', async () => {
  const { item, owner, claimant, stranger } = await fixture();
  const incoming = await Message.create({
    itemId: item._id, senderId: claimant._id, receiverId: owner._id, text: 'I found it',
  });
  const otherConversation = await Message.create({
    itemId: item._id, senderId: stranger._id, receiverId: owner._id, text: 'Another conversation',
  });
  const response = await request(`/api/messages/${item._id}/${claimant._id}`, { token: tokenFor(owner) });
  assert.equal(response.code, 200);
  assert.deepEqual(response.body.map(message => message._id), [incoming._id.toString()]);
  assert.equal((await Message.findById(incoming._id)).isRead, true);
  assert.equal((await Message.findById(otherConversation._id)).isRead, false);
});

test('handover progresses from finder confirmation to owner confirmation', async () => {
  const { item, owner, claimant } = await fixture();
  const path = `/api/handovers/${item._id}`;
  const ownerToken = tokenFor(owner);
  const finderToken = tokenFor(claimant);
  const initial = await request(`${path}/${claimant._id}`, { token: ownerToken });
  assert.deepEqual(initial.body, { record: null, isOwner: true, isFinder: false });

  const premature = await request(`${path}/${claimant._id}/confirm-owner`, {
    method: 'POST', token: ownerToken,
  });
  assert.equal(premature.code, 400);

  const found = await request(`${path}/${owner._id}/confirm-finder`, {
    method: 'POST', token: finderToken,
  });
  assert.equal(found.code, 200);
  assert.equal(found.body.status, 'FINDER_CONFIRMED');
  const confirmed = await request(`${path}/${claimant._id}/confirm-owner`, {
    method: 'POST', token: ownerToken,
  });
  assert.equal(confirmed.code, 200);
  assert.equal(confirmed.body._id, found.body._id);
  assert.equal(confirmed.body.status, 'OWNER_FINDER_VERIFIED');
});

test('inbox returns the latest item thread and marks only the caller’s messages read', async () => {
  const { item, owner, claimant } = await fixture();
  const [older, latest, outgoing] = await Message.create([
    { itemId: item._id, senderId: claimant._id, receiverId: owner._id, text: 'First', createdAt: new Date(1000) },
    { itemId: item._id, senderId: claimant._id, receiverId: owner._id, text: 'Latest', createdAt: new Date(3000) },
    { itemId: item._id, senderId: owner._id, receiverId: claimant._id, text: 'Reply', createdAt: new Date(2000) },
  ]);
  const token = tokenFor(owner);
  const inbox = await request('/api/messages/inbox', { token });
  assert.equal(inbox.code, 200);
  assert.deepEqual(inbox.body.map(message => message._id), [latest._id.toString()]);
  assert.equal((await request('/api/messages/unread-count', { token })).body.count, 2);
  assert.equal((await request('/api/messages/mark-all-read', { method: 'PUT', token })).code, 200);
  assert.equal((await request('/api/messages/unread-count', { token })).body.count, 0);
  assert.equal((await Message.findById(older._id)).isRead, true);
  assert.equal((await Message.findById(outgoing._id)).isRead, false);
});

test('handover PDF is streamed as an attachment', async () => {
  const { item, owner } = await fixture();
  const response = await fetch(`${baseURL}/api/items/${item._id}/download-pdf`, {
    headers: { Authorization: `Bearer ${tokenFor(owner)}` },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(response.headers.get('content-disposition'), `attachment; filename="Handover_Declaration_${item._id}.pdf"`);
  assert.ok(Buffer.from(await response.arrayBuffer()).subarray(0, 5).equals(Buffer.from('%PDF-')));
});

test('hotspots group nearby lost and found reports and exclude archived reports', async () => {
  const { item, owner } = await fixture();
  item.latitude = 6.9271;
  item.longitude = 79.8612;
  await item.save();
  const nearby = {
    title: 'Nearby phone', description: 'Disposable report', type: 'FOUND', category: item.category,
    date: item.date, province: item.province, district: item.district, city: item.city,
    contactNumber: item.contactNumber, createdBy: owner._id, latitude: 6.928, longitude: 79.862,
  };
  await Item.create([nearby, { ...nearby, archiveStatus: 'archived' }]);
  const response = await request('/api/items/hotspots?category=Electronics');
  assert.equal(response.code, 200);
  assert.equal(response.body.hotspots.length, 1);
  assert.equal(response.body.hotspots[0].lostCount, 1);
  assert.equal(response.body.hotspots[0].foundCount, 1);
});

test('registered users can sign in and admin statistics require the admin role', async () => {
  const account = { username: 'integration-reporter', password: 'Synthetic-Password-1' };
  assert.equal((await request('/api/auth/register', { method: 'POST', body: account })).code, 201);
  assert.equal((await request('/api/auth/register', { method: 'POST', body: account })).code, 400);
  const login = await request('/api/auth/login', { method: 'POST', body: account });
  assert.equal(login.code, 200);
  const token = login.body.token;
  const profile = await request('/api/auth/me', { token });
  assert.equal(profile.body.user.username, account.username);
  assert.equal(profile.body.user.password, undefined);
  assert.equal((await request('/api/admin/stats', { token })).code, 403);
  await User.findOneAndUpdate({ username: account.username }, { role: 'admin' });
  const stats = await request('/api/admin/stats', { token });
  assert.equal(stats.code, 200);
  assert.equal(stats.body.stats.totalUsers, 1);
});

test('notifications stay scoped to the signed-in recipient', async () => {
  const { owner, claimant } = await fixture();
  const [mine, other] = await Notification.create([
    { userId: owner._id, message: 'Your tip was sent', type: 'TIP_SENT' },
    { userId: claimant._id, message: 'Your tip arrived', type: 'TIP_RECEIVED' },
  ]);
  const token = tokenFor(owner);
  const list = await request('/api/notifications', { token });
  assert.equal(list.code, 200);
  assert.deepEqual(list.body.map(notification => notification._id), [mine._id.toString()]);
  assert.equal((await request('/api/notifications/read-all', { method: 'PUT', token })).code, 200);
  assert.equal((await Notification.findById(mine._id)).isRead, true);
  assert.equal((await Notification.findById(other._id)).isRead, false);
});

test('skipping a tip is reflected in owner and finder history', async () => {
  const { item, owner, claimant } = await fixture();
  item.status = 'Claimed';
  await item.save();
  const now = new Date();
  const record = await ReturnRecord.create({
    itemId: item._id, ownerId: owner._id, finderId: claimant._id, status: 'RETURN_COMPLETED',
    finderConfirmedAt: now, ownerConfirmedAt: now, ownerReceivedAt: now,
  });
  const ownerToken = tokenFor(owner);
  const skip = await request('/api/tips/skip', {
    method: 'POST', token: ownerToken, body: { returnRecordId: record._id.toString() },
  });
  assert.equal(skip.code, 200, skip.body.message);
  assert.equal(skip.body.tip.paymentStatus, 'skipped');
  for (const [role, token] of [['owner', ownerToken], ['finder', tokenFor(claimant)]]) {
    const history = await request(`/api/history/${role}`, { token });
    assert.equal(history.code, 200);
    assert.equal(history.body[0]._id, record._id.toString());
    assert.equal(history.body[0].tip._id, skip.body.tip._id);
  }
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
