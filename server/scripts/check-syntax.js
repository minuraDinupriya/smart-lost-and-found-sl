const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const serverRoot = path.resolve(__dirname, '..');
const excludedDirectories = new Set(['node_modules', 'uploads', '.git']);

const collectJavaScriptFiles = (directory) => {
  const files = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory() && !excludedDirectories.has(entry.name)) {
      files.push(...collectJavaScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }

  return files.sort();
};

const files = collectJavaScriptFiles(serverRoot);
let failed = false;

for (const file of files) {
  // Parse only: importing these files could start the API or mutate a database.
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error(`Syntax check failed: ${path.relative(serverRoot, file)}`);
    if (result.error) console.error(result.error.message);
    failed = true;
  }
}

if (failed) process.exitCode = 1;
else console.info(`Syntax checked ${files.length} server JavaScript files. API behavior was not tested.`);
