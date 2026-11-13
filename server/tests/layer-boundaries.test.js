const { readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const serverRoot = path.resolve(__dirname, '..');

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(filename);
    return entry.isFile() && entry.name.endsWith('.js') ? [filename] : [];
  });
}

test('runtime backend modules follow the layer dependency direction', () => {
  const rules = {
    presentation: { layers: ['data-access'], packages: ['mongoose'] },
    business: { layers: ['presentation', 'data-access/models'], packages: ['express', 'mongoose'] },
    'data-access': { layers: ['presentation', 'business'], packages: ['express', 'socket.io'] },
  };
  const violations = [];
  for (const [layer, { layers, packages }] of Object.entries(rules)) {
    for (const file of javascriptFiles(path.join(serverRoot, layer))) {
      const source = readFileSync(file, 'utf8');
      for (const [, dependency] of source.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        const target = path.relative(serverRoot, path.resolve(path.dirname(file), dependency))
          .split(path.sep).join('/');
        const forbiddenLayer = dependency.startsWith('.') &&
          layers.some(prefix => target === prefix || target.startsWith(prefix + '/'));
        const forbiddenPackage = packages.some(name => dependency === name || dependency.startsWith(name + '/'));
        if (forbiddenLayer || forbiddenPackage) {
          violations.push(`${path.relative(serverRoot, file)} imports ${dependency}`);
        }
      }
    }
  }
  assert.deepEqual(violations, []);
});
