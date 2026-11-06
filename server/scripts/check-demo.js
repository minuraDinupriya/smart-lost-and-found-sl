const assert = require('node:assert/strict');
const base = 'http://localhost:5003/api';
const itemId = '000000000000000000000101', finderId = '000000000000000000000002';
const call = async (url, token, body) => {
  const response = await fetch(base + url, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal(response.status, 200, `Unexpected response at ${url}`);
  return response.json();
};
const run = async () => {
  const owner = await call('/auth/login', null, { username: 'demo_owner', password: 'LearnWithDemo2027!' });
  const finder = await call('/auth/login', null, { username: 'demo_finder', password: 'LearnWithDemo2027!' });
  const publicItem = await call(`/items/${itemId}`);
  assert.equal(JSON.stringify(publicItem).includes('DEMO-4829'), false);
  const verified = await call(`/items/${itemId}/verify-ownership`, finder.token, { submittedProofs: [{ proofType: 'serialNumber', proofValue: 'DEMO-4829' }, { proofType: 'custom', customLabel: 'Receipt code', proofValue: 'DEMO-RECEIPT-42' }] });
  assert.equal(verified.status, 'VERIFIED');
  const before = await call('/auth/me', finder.token);
  const state = await call(`/handovers/${itemId}/${finderId}`, owner.token);
  const expectedAward = state.record?.status === 'RETURN_COMPLETED' ? 0 : 50;
  await Promise.all(Array.from({ length: 12 }, () => call(`/handovers/${itemId}/${finderId}/confirm-receipt`, owner.token, {})));
  const after = await call('/auth/me', finder.token);
  assert.equal(after.user.karmaPoints, before.user.karmaPoints + expectedAward);
  assert.equal((await call(`/items/${itemId}`)).status, 'Claimed');
  console.info(`Demo smoke check passed: private values hidden, exact details verified, 12 receipt requests awarded ${expectedAward} points total. Finder score: ${after.user.karmaPoints}.`);
};
run().catch(error => { console.error(error.message); process.exitCode = 1; });
