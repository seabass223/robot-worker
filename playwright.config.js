import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 900 } },
  webServer: [
    { command: 'npm run preview -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
    { command: 'npm run api -- --port 8001', url: 'http://127.0.0.1:8001/event?health=1', reuseExistingServer: true }
  ]
});
