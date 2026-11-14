import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4176';
const apiOrigin = 'http://127.0.0.1:5004';

export default defineConfig({
  testDir: './recovery-tests',
  outputDir: process.env.RECORD_WALKTHROUGH ? 'test-results/recording-run' : 'test-results/recovery',
  testMatch: process.env.RECORD_WALKTHROUGH ? '**/record-walkthrough.spec.js' : undefined,
  testIgnore: process.env.RECORD_WALKTHROUGH ? undefined : '**/record-walkthrough.spec.js',
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  use: { baseURL, channel: process.env.PLAYWRIGHT_CHANNEL, serviceWorkers: 'block' },
  webServer: [
    {
      command: 'node ../server/scripts/demo.js --browser-test',
      url: apiOrigin,
      timeout: 120_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4176 --strictPort',
      url: baseURL,
      env: { VITE_API_URL: `${apiOrigin}/api`, VITE_GOOGLE_CLIENT_ID: '' },
    },
  ],
});
