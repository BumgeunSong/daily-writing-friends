import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Load environment variables for E2E testing
 * This ensures emulator configuration is available during tests
 */
// Load .env.e2e for E2E test configuration
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, 'config', '.env.e2e') });
} else {
  dotenv.config(); // Load default .env file
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  
  /* Global setup and teardown for E2E testing */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.CI ? 'http://localhost:5173' : 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording */
    video: 'retain-on-failure',
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      // Add any custom headers for testing
    },
    
    /* Ignore HTTPS errors for local development */
    ignoreHTTPSErrors: true,
  },
  
  /* Configure timeout */
  timeout: 30 * 1000, // 30 seconds
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
  
  /* Web Server Configuration */
  webServer: {
    command: process.env.CI 
      ? 'npm run dev:emu' 
      : 'cross-env VITE_USE_EMULATORS=true vite --mode e2e --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes to start the server
    env: {
      VITE_USE_EMULATORS: 'true',
      NODE_ENV: 'test'
    }
  },
  
  /* Output directory */
  outputDir: 'test-results/',
  
  /* Storage state for authentication */
  // Note: This will be set per-project below

  /* Configure projects for major browsers */
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    
    // Cleanup project  
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/,
    },

    // Main test projects with authentication
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

    // Mobile viewports (optional)
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: './tests/storageState.auth.json',
      },
      dependencies: ['setup'],
    },
    
    // Tests that require no authentication
    {
      name: 'chromium-logged-out',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.logged-out\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],

});
