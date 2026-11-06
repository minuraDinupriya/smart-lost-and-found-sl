const test = require('node:test');
const assert = require('node:assert/strict');
const { getJwtSecret, getAllowedOrigins, isAllowedOrigin } = require('../config/security');

test('JWT configuration rejects missing, short, and known placeholder secrets', () => {
  for (const JWT_SECRET of [undefined, '', 'short', 'fallback_secret_for_usjp_lost_and_found_dev']) {
    assert.throws(() => getJwtSecret({ JWT_SECRET }), /JWT_SECRET/);
  }
  assert.equal(getJwtSecret({ JWT_SECRET: 'a'.repeat(48) }), 'a'.repeat(48));
});

test('production CORS allows only configured exact origins', () => {
  const origins = getAllowedOrigins({ NODE_ENV: 'production', CLIENT_URL: 'https://lost-found.example/' });
  assert.equal(isAllowedOrigin('https://lost-found.example', origins), true);
  for (const origin of ['https://other.vercel.app', 'https://lost-found.example.attacker.test', 'http://localhost:5173']) {
    assert.equal(isAllowedOrigin(origin, origins), false);
  }
  assert.equal(isAllowedOrigin(undefined, origins), true);
  assert.throws(() => getAllowedOrigins({ NODE_ENV: 'production' }), /CLIENT_URL/);
  assert.throws(() => getAllowedOrigins({ CLIENT_URL: 'https://site.test/path' }));
});
