const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const proof = { _id: 'proof-1', proofType: 'serialNumber', proofValue: 'PRIVATE-SERIAL-481' };

const loadController = ({ proofs = [proof], missing = false } = {}) => {
  const state = { saves: 0, queries: 0, messages: [], notifications: [] };
  const Item = {
    findById() {
      state.queries++;
      let includeProofs = false;
      return {
        select(fields) { includeProofs = fields.split(/\s+/).includes('+ownershipProofs'); return this; },
        populate() { return this; },
        then(resolve, reject) {
          const item = {
            _id: 'item-1', createdBy: { _id: 'creator', toString: () => 'creator' },
            status: 'Available', verificationHistory: [],
            // Model the schema's select:false projection, without a database.
            ...(includeProofs ? { ownershipProofs: proofs } : {}),
            async save() { state.saves++; state.savedItem = this; },
            toObject() {
              return {
                _id: this._id, createdBy: this.createdBy, status: this.status,
                verificationHistory: this.verificationHistory,
                ...(includeProofs ? { ownershipProofs: proofs } : {}),
              };
            },
          };
          return Promise.resolve(missing ? null : item).then(resolve, reject);
        },
      };
    },
  };
  const dependencies = {
    '../config/security': { getJwtSecret: () => 'test-only-secret-not-used-by-mocked-jwt' },
    '../models/Item': Item,
    '../models/Message': {
      create: async (message) => { state.messages.push(message); return message; },
      exists: async () => false,
    },
    '../models/User': { findById: async () => ({ username: 'test-claimant' }) },
    '../models/ReturnRecord': { findOne: () => ({ populate() { return this; }, then(resolve) { return Promise.resolve(null).then(resolve); } }) },
    '../services/socket.service': { emitGlobalNotification: (...args) => state.notifications.push(args) },
    'google-translate-api-x': () => { throw new Error('Unexpected translation call'); },
    cloudinary: { v2: { config() {} } },
    path: require('node:path'), fs: require('node:fs'),
    '../utils/imageHash': {}, '../services/itemIdentification.service': {},
    '../services/voiceReporting.service': {}, '../services/matching.service': {},
    // These tests cover exact matches and selection, not the fuzzy-match algorithm.
    'string-similarity': { compareTwoStrings: () => 0 },
    jsonwebtoken: { verify: (token) => ({ id: token === 'test-creator' ? 'creator' : 'claimant' }) },
  };
  const context = {
    module: { exports: {} }, process: { env: {} }, console: { error() {} },
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  };
  const controllerPath = path.resolve(__dirname, '../controllers/item.controller.js');
  vm.runInNewContext(fs.readFileSync(controllerPath, 'utf8'), context, { filename: controllerPath });

  const invoke = async (handler, { submittedProofs = [proof], creator = false, authenticated = false } = {}) => {
    const response = { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await context.module.exports[handler]({
      params: { itemId: 'item-1' }, body: { submittedProofs }, userId: 'claimant',
      headers: creator ? { authorization: 'Bearer test-creator' } : authenticated ? { authorization: 'Bearer test-claimant' } : {},
    }, response);
    return response;
  };
  return { state, invoke };
};

test('an exact claim verifies saved private proofs without exposing answers in results or messages', async () => {
  const { state, invoke } = loadController();
  const response = await invoke('verifyOwnership');
  assert.equal(response.code, 200);
  assert.equal(response.body.status, 'VERIFIED');
  assert.equal(response.body.scorePercentage, 100);
  assert.equal(state.saves, 1);
  assert.equal(state.savedItem.status, 'Pending Verification');
  assert.equal(state.savedItem.verificationHistory[0].overallStatus, 'VERIFIED');
  assert.equal(state.messages.length, 1);
  assert.equal(JSON.stringify([response.body, state.messages, state.notifications]).includes(proof.proofValue), false);
});

test('a mismatching claim stays unverified and does not change the available status', async () => {
  const { state, invoke } = loadController();
  const response = await invoke('verifyOwnership', { submittedProofs: [{ proofType: 'serialNumber', proofValue: 'different' }] });
  assert.equal(response.code, 200);
  assert.equal(response.body.status, 'NOT_VERIFIED');
  assert.equal(response.body.scorePercentage, 0);
  assert.equal(state.savedItem.status, 'Available');
});

test('one match out of two proofs is recorded as partial verification', async () => {
  const { state, invoke } = loadController({ proofs: [proof, { proofType: 'engraving', proofValue: 'PRIVATE-ENGRAVING' }] });
  const response = await invoke('verifyOwnership');
  assert.equal(response.code, 200);
  assert.equal(response.body.status, 'PARTIALLY_VERIFIED');
  assert.equal(response.body.scorePercentage, 50);
  assert.equal(state.savedItem.verificationHistory[0].totalProofs, 2);
});

test('an item without registered proofs returns 400 without saving or notifying', async () => {
  const { state, invoke } = loadController({ proofs: [] });
  const response = await invoke('verifyOwnership');
  assert.equal(response.code, 400);
  assert.equal(state.saves, 0);
  assert.equal(state.notifications.length, 0);
});

test('a missing item returns 404 without saving', async () => {
  const { state, invoke } = loadController({ missing: true });
  assert.equal((await invoke('verifyOwnership')).code, 404);
  assert.equal(state.saves, 0);
});

test('a non-array submission returns 400 before querying', async () => {
  const { state, invoke } = loadController();
  assert.equal((await invoke('verifyOwnership', { submittedProofs: {} })).code, 400);
  assert.equal(state.queries, 0);
});

test('public item details expose proof labels for the claim form, but never proof values', async () => {
  const { invoke } = loadController();
  const response = await invoke('getItemById');
  assert.equal(response.code, 200);
  assert.equal(response.body.ownershipProofs?.[0].proofType, 'serialNumber');
  assert.equal(Object.hasOwn(response.body.ownershipProofs[0], 'proofValue'), false);
  assert.equal(JSON.stringify(response.body).includes(proof.proofValue), false);
  assert.equal(Object.hasOwn(response.body, 'verificationHistory'), false);
});

test('the creator can still retrieve their own proof values', async () => {
  const { invoke } = loadController();
  const response = await invoke('getItemById', { creator: true });
  assert.equal(response.code, 200);
  assert.equal(response.body.ownershipProofs?.[0].proofValue, proof.proofValue);
});

test('an authenticated non-creator receives labels without private answers or history', async () => {
  const { invoke } = loadController();
  const response = await invoke('getItemById', { authenticated: true });
  assert.equal(response.code, 200);
  assert.equal(response.body.ownershipProofs?.[0].proofType, 'serialNumber');
  assert.equal(Object.hasOwn(response.body.ownershipProofs[0], 'proofValue'), false);
  assert.equal(Object.hasOwn(response.body, 'verificationHistory'), false);
});
