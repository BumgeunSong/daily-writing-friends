import { defineConfig, devices } from '@playwright/test';

// Env vars are loaded by the caller (e.g. `source config/.env.prod.e2e`) or CI secrets.
// Do NOT use dotenv here — ESM compatibility requires plain process.env references.

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,          // sequential for production safety
  retries: 1,
  workers: 1,                    // single worker to avoid race conditions on prod data
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  timeout: 60 * 1000,            // longer timeout for production network
  expect: { timeout: 15 * 1000 },

  // No webServer — testing against live production
  projects: [
    {
      name: 'prod-setup',
      testMatch: /auth\.setup\.ts/,
      teardown: 'prod-teardown',
    },
    {
      name: 'prod-teardown',
      testMatch: /prod\.teardown\.ts/,
    },
    {
      name: 'prod-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/storageState.auth.json',
      },
      dependencies: ['prod-setup'],
    },
  ],

  outputDir: 'test-results/',
});
