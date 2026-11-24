import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const api = new URL('http://127.0.0.1:3109');
const web = new URL('http://127.0.0.1:5179');

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  workers: 3,
  forbidOnly: !!process.env['CI'],
  use: {
    baseURL: web.origin,
    timezoneId: 'UTC',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // macOS 27 restricts CLI browsers' access to the user's Firefox data.
        launchOptions:
          process.platform === 'darwin'
            ? {
                env: {
                  MOZ_APP_DATA: join(
                    __dirname,
                    'test-results',
                    'firefox-app-data',
                  ),
                },
              }
            : {},
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: `node --require ts-node/register e2e/start-api.ts ${api.port}`,
      url: `${api.origin}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
    {
      command: `npm --prefix client run dev -- --port ${web.port}`,
      env: { CAMPUSHUB_API_ORIGIN: api.origin },
      url: web.origin,
      reuseExistingServer: false,
    },
  ],
});
