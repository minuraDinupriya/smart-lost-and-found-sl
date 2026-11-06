const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Item = require('../../models/Item');
const User = require('../../models/User');
const ReturnRecord = require('../../models/ReturnRecord');
const { claimDirect, completeReturn } = require('../../services/return.service');
let database;

before(async () => {
  database = await MongoMemoryReplSet.create({
    binary: { version: '8.2.6', downloadDir: path.resolve(__dirname, '../../node_modules/.cache/mongodb-memory-server') },
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await mongoose.connect(database.getUri(), { dbName: 'return_tests' });
  await Promise.all([Item.init(), User.init(), ReturnRecord.init()]);
});
after(async () => { await mongoose.disconnect(); if (database) await database.stop(); });
beforeEach(async () => { await Promise.all([Item.deleteMany({}), User.deleteMany({}), ReturnRecord.deleteMany({})]); });

const fixture = async (type = 'FOUND') => {
  const owner = await User.create({ username: 'owner' });
  const finder = await User.create({ username: 'finder' });
  const item = await Item.create({
    title: 'Test keys', description: 'Disposable test report', type, category: 'Keys',
    date: new Date(), province: 'Western', district: 'Colombo', city: 'Colombo',
    contactNumber: '0000000000', createdBy: type === 'FOUND' ? finder._id : owner._id,
  });
  const record = await ReturnRecord.create({ itemId: item._id, ownerId: owner._id, finderId: finder._id, status: 'OWNER_FINDER_VERIFIED', finderConfirmedAt: new Date() });
  return { item, owner, finder, record, args: { itemId: item._id.toString(), ownerId: owner._id.toString(), finderId: finder._id.toString() } };
};

test('parallel direct claims award exactly 50 karma and retries remain successful', async () => {
  const { item, finder } = await fixture();
  await Promise.all(Array.from({ length: 12 }, () => claimDirect(item._id.toString(), finder._id.toString())));
  assert.equal((await User.findById(finder._id)).karmaPoints, 50);
  assert.equal((await Item.findById(item._id)).status, 'Claimed');
});
test('parallel receipt confirmations complete one return and award once', async () => {
  const { args, finder, record } = await fixture();
  await Promise.all(Array.from({ length: 12 }, () => completeReturn(args)));
  assert.equal((await User.findById(finder._id)).karmaPoints, 50);
  assert.equal((await ReturnRecord.findById(record._id)).status, 'RETURN_COMPLETED');
});
test('direct claim racing a receipt confirmation cannot award twice', async () => {
  const { args, item, finder } = await fixture();
  const results = await Promise.allSettled([claimDirect(item._id.toString(), finder._id.toString()), completeReturn(args)]);
  assert.ok(results.some(result => result.status === 'fulfilled'));
  for (const result of results) if (result.status === 'rejected') assert.equal(result.reason.status, 409);
  assert.equal((await User.findById(finder._id)).karmaPoints, 50);
});
test('a missing finder rolls back both the claim and return record', async () => {
  const { args, finder, item, record } = await fixture();
  await User.deleteOne({ _id: finder._id });
  await assert.rejects(completeReturn(args), error => error.status === 404);
  assert.equal((await Item.findById(item._id)).status, 'Available');
  assert.equal((await ReturnRecord.findById(record._id)).status, 'OWNER_FINDER_VERIFIED');
});
test('two candidate finders cannot complete the same item', async () => {
  const { args, owner, item, finder } = await fixture('LOST');
  const second = await User.create({ username: 'second-finder' });
  await ReturnRecord.create({ itemId: item._id, ownerId: owner._id, finderId: second._id, status: 'OWNER_FINDER_VERIFIED' });
  const results = await Promise.allSettled([completeReturn(args), completeReturn({ ...args, finderId: second._id.toString() })]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.status, 409);
  assert.equal((await User.findById(finder._id)).karmaPoints + (await User.findById(second._id)).karmaPoints, 50);
});
test('an unrelated creator cannot claim or award karma', async () => {
  const { item, owner, finder } = await fixture();
  await assert.rejects(claimDirect(item._id.toString(), owner._id.toString()), error => error.status === 403);
  assert.equal((await User.findById(finder._id)).karmaPoints, 0);
  assert.equal((await Item.findById(item._id)).status, 'Available');
});
test('repeating owner confirmation cannot reopen a completed return', async () => {
  const { args, record } = await fixture();
  await completeReturn(args);
  const controller = require('../../controllers/handover.controller');
  const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await controller.confirmOwner({ params: { itemId: args.itemId, otherUserId: args.finderId }, userId: args.ownerId }, response);
  assert.equal(response.code, 200);
  assert.equal((await ReturnRecord.findById(record._id)).status, 'RETURN_COMPLETED');
});
