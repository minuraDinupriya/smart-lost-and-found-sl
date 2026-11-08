import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4175';

export default defineConfig({
  testDir: './tests',
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 1 : undefined,
  use: { baseURL, channel: process.env.PLAYWRIGHT_CHANNEL, serviceWorkers: 'block' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4175 --strictPort',
    url: baseURL,
    env: { VITE_API_URL: `${baseURL}/api`, VITE_GOOGLE_CLIENT_ID: '' },
  },
});
