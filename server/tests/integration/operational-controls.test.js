const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const User = require('../../data-access/models/User');
const { isDatabaseReady } = require('../../data-access/repositories/database-health.repository');
const { signSession } = require('../../business/services/session.service');
const authRoutes = require('../../presentation/routes/auth.routes');
const itemRoutes = require('../../presentation/routes/item.routes');
const { createHealthRoutes } = require('../../presentation/routes/health.routes');

let database, server, baseUrl, reporterToken, secondReporterToken;

before(async () => {
  // Never load .env or contact the configured application database or providers.
  process.env.JWT_SECRET = 'operations-test-only-secret-01234567890123456789';
  database = await MongoMemoryReplSet.create({
    binary: { version: '8.2.6', downloadDir: path.resolve(__dirname, '../../node_modules/.cache/mongodb-memory-server') },
    replSet: { count: 1 },
  });
  await mongoose.connect(database.getUri('operational_controls_tests'));
  const reporters = await User.create([{ username: 'reporter' }, { username: 'another-reporter' }]);
  [reporterToken, secondReporterToken] = reporters.map(reporter => signSession(reporter.id));

  const app = express();
  app.use(express.json());
  app.use(createHealthRoutes(isDatabaseReady));
  app.use('/api/auth', authRoutes);
  app.use('/api/items', itemRoutes);
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', resolve);
    server.on('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
});

const request = async (url, { token, method = 'POST' } = {}) => {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { code: response.status, headers: response.headers, body: await response.json() };
};

const assertThrottled = (response, policy) => {
  assert.equal(response.code, 429);
  assert.equal(response.body.code, 'RATE_LIMITED');
  assert.match(response.headers.get('retry-after'), /^[1-9]\d*$/);
  assert.ok(response.headers.get('ratelimit-policy')?.includes(policy));
};

test('authentication shares a budget across its sign-in and registration endpoints', async () => {
  // Incomplete requests are rejected locally; they do not use real credentials or OAuth.
  for (let attempt = 0; attempt < 30; attempt++) {
    const endpoint = attempt % 2 === 0 ? '/api/auth/login' : '/api/auth/register';
    assert.equal((await request(endpoint)).code, 400);
  }
  assertThrottled(await request('/api/auth/google'), 'authentication');
});

test('ownership verification counts attempts by authenticated account', async () => {
  const verification = '/api/items/000000000000000000000101/verify-ownership';
  assert.equal((await request(verification)).code, 403);
  for (let attempt = 0; attempt < 10; attempt++) {
    assert.equal((await request(verification, { token: reporterToken })).code, 400);
  }
  assertThrottled(await request(verification, { token: reporterToken }), 'ownership-verification');
  assert.equal((await request(verification, { token: secondReporterToken })).code, 400);
});

test('image and voice analysis share an AI budget, separate from proof verification', async () => {
  assert.equal((await request('/api/items/debug-ai', { method: 'GET' })).code, 403);
  assert.equal((await request('/api/items/debug-ai', { method: 'GET', token: reporterToken })).code, 403);
  for (let attempt = 0; attempt < 8; attempt++) {
    // No file goes to a provider; these requests verify the real route pipeline and its shared quota.
    const endpoint = attempt % 2 === 0 ? '/api/items/identify' : '/api/items/voice-analyze';
    assert.equal((await request(endpoint, { token: reporterToken })).code, 400);
  }
  assertThrottled(await request('/api/items/voice-analyze', { token: reporterToken }), 'ai-analysis');
  assert.equal((await request('/api/items/identify', { token: secondReporterToken })).code, 400);
});

test('readiness reports real database connectivity without exposing its details', async () => {
  const read = () => request('/readyz', { method: 'GET' });
  const ready = await read();
  assert.equal(ready.code, 200);
  assert.equal(ready.headers.get('cache-control'), 'no-store');
  assert.deepEqual(ready.body, { status: 'ready' });

  await mongoose.disconnect();
  const unavailable = await read();
  assert.equal(unavailable.code, 503);
  assert.equal(unavailable.headers.get('cache-control'), 'no-store');
  assert.deepEqual(unavailable.body, { status: 'unavailable' });

  await mongoose.connect(database.getUri('operational_controls_tests'));
  assert.equal((await read()).code, 200);
});
