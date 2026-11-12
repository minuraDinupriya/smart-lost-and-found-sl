const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const runSeedScript = async (scriptName, env) => {
  const scriptPath = path.resolve(__dirname, '../scripts', scriptName);
  const result = { connections: [], writes: [], hashes: [], exits: [], output: [] };
  const recordOutput = (...args) => result.output.push(args.map(String).join(' '));

  class User {
    constructor(data) { this.data = data; }
    async save() { result.writes.push({ operation: 'saveUser', data: this.data }); }
    static async findOne() {
      return scriptName === 'seed.js' ? { _id: 'seed-test-user', username: 'seed-test-user' } : null;
    }
  }

  const dependencies = {
    mongoose: { connect: async (uri) => { result.connections.push(uri); } },
    // Never load a developer's .env or use any real external dependencies.
    dotenv: { config() {} },
    path,
    '../data-access/models/User': User,
    '../data-access/models/Item': {
      deleteMany: async () => { result.writes.push({ operation: 'deleteItems' }); },
      insertMany: async (items) => { result.writes.push({ operation: 'insertItems', count: items.length }); },
    },
    'google-translate-api-x': async (text) => ({ text }),
    bcryptjs: {
      genSalt: async () => 'test-salt',
      hash: async (password) => {
        result.hashes.push(password);
        return 'test-hashed-password';
      },
    },
  };

  await vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), {
    __dirname: path.dirname(scriptPath),
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    process: {
      env: { ...env },
      exit: (code = 0) => { result.exits.push(code); },
      stdout: { write: recordOutput },
    },
    console: { log: recordOutput, info: recordOutput, error: recordOutput, warn: recordOutput },
  }, { filename: scriptPath });

  return result;
};

for (const scriptName of ['seed.js', 'seedPolice.js']) {
  for (const mongoUri of [undefined, '', '   ']) {
    test(`${scriptName} rejects ${JSON.stringify(mongoUri)} MONGO_URI before connecting or writing`, async () => {
      const result = await runSeedScript(scriptName, {
        MONGO_URI: mongoUri,
        SEED_POLICE_PASSWORD: 'test-only-seed-password',
      });

      assert.equal(result.connections.length, 0, 'Missing configuration must not select a fallback database');
      assert.equal(result.writes.length, 0);
      assert.deepEqual(result.exits, [1]);
      assert.match(result.output.join('\n'), /MONGO_URI/);
    });
  }
}

test('item seeding uses only the configured database', async () => {
  const mongoUri = 'mongodb://127.0.0.1:27017/seed_credentials_test';
  const result = await runSeedScript('seed.js', { MONGO_URI: mongoUri });

  assert.deepEqual(result.connections, [mongoUri]);
  assert.deepEqual(result.writes, [
    { operation: 'deleteItems' },
    { operation: 'insertItems', count: 15 },
  ]);
  assert.deepEqual(result.exits, [0]);
});

for (const password of [undefined, '', '   ']) {
  test(`police seeding rejects ${JSON.stringify(password)} password before connecting or creating an account`, async () => {
    const result = await runSeedScript('seedPolice.js', {
      MONGO_URI: 'mongodb://127.0.0.1:27017/seed_credentials_test',
      SEED_POLICE_PASSWORD: password,
    });

    assert.equal(result.connections.length, 0);
    assert.equal(result.writes.length, 0);
    assert.equal(result.hashes.length, 0);
    assert.deepEqual(result.exits, [1]);
    assert.match(result.output.join('\n'), /SEED_POLICE_PASSWORD/);
  });
}

test('police seeding hashes the configured password and never logs it', async () => {
  const mongoUri = 'mongodb://127.0.0.1:27017/seed_credentials_test';
  const password = 'test-only-explicit-police-password';
  const result = await runSeedScript('seedPolice.js', {
    MONGO_URI: mongoUri,
    SEED_POLICE_PASSWORD: password,
  });

  assert.deepEqual(result.connections, [mongoUri]);
  assert.ok(result.hashes.length === 1 && result.hashes[0] === password, 'The configured password must be hashed');
  assert.equal(result.writes.length, 1);
  assert.equal(result.writes[0].data.password, 'test-hashed-password');
  assert.equal(result.writes[0].data.role, 'police');
  assert.equal(result.output.join('\n').includes(password), false);
  assert.deepEqual(result.exits, [0]);
});
