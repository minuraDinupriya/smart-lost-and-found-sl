import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', '5175', '--strictPort'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_API_URL: 'http://localhost:5003/api', VITE_GOOGLE_CLIENT_ID: '' },
});
child.on('exit', code => { process.exitCode = code ?? 1; });
