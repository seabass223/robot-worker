import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [] }
  },
  webServer: [
    { command: 'npm run preview -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
    { command: 'node server/event-api-test.mjs --port 8001', url: 'http://127.0.0.1:8001/event?health=1', reuseExistingServer: false },
    { command: 'node server/event-api-legacy-test.mjs --port 8012', url: 'http://127.0.0.1:8012/event?health=1', reuseExistingServer: false }
  ]
});
