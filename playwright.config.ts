import { defineConfig, devices } from '@playwright/test';

const port = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 5174;
const baseURL = `http://localhost:${port}`;

// Ensure auth.setup.ts uses the correct origin for storageState
process.env.E2E_BASE_URL = process.env.E2E_BASE_URL || baseURL;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  globalSetup: './tests/global-setup.ts',
  testDir: './tests',
  testIgnore: ['**/fixtures/**', '**/helpers/**', '**/*.test.ts', '**/data-flows/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },

  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },

  webServer: {
    command: `cd apps/web && npx vite --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      NODE_ENV: 'test',
      E2E_BASE_URL: baseURL,
    },
  },

  outputDir: 'test-results/',

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /auth\.teardown\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/storageState.auth.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: './tests/storageState.auth.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: './tests/storageState.auth.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: './tests/storageState.auth.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'chromium-no-auth',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.logged-out\.spec\.ts/,
    },
    {
      name: 'chromium-data-flows',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/storageState.auth.json',
      },
      testDir: './tests/data-flows',
      testIgnore: ['**/*.non-member.spec.ts'],
      dependencies: ['setup'],
    },
    {
      name: 'chromium-non-member',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/storageState.non-member.json',
      },
      testDir: './tests/data-flows',
      testMatch: /.*\.non-member\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],
});
