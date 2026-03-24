import { chromium, FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const execAsync = promisify(exec);

/**
 * Global setup for Playwright E2E tests
 *
 * This setup function:
 * 1. Ensures Supabase local is running
 * 2. Seeds the database with test users
 * 3. Sets up authentication state for tests
 * 4. Verifies the Vite dev server is accessible
 */
async function globalSetup(config: FullConfig) {
  console.log('Starting Playwright global setup...');

  try {
    // Check if Supabase local is running
    await checkSupabaseRunning();

    // Seed the database with test users
    await seedUsers();

    // Create authentication state for tests
    await createAuthState(config);

    console.log('Global setup completed successfully');

  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  }
}

/**
 * Check if Supabase local is running by polling the Auth health endpoint.
 * Does NOT attempt to start Supabase (requires Docker — start it manually).
 */
async function checkSupabaseRunning() {
  console.log('Checking if Supabase local is running...');

  const healthUrl = 'http://127.0.0.1:54321/auth/v1/health';
  const maxAttempts = 10;
  const intervalMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        console.log(`Supabase local is running at ${healthUrl}`);
        return;
      }
    } catch {
      // Not yet reachable
    }

    if (attempt < maxAttempts) {
      console.log(`Waiting for Supabase... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(
    'Supabase local is not running. Please start it before running E2E tests:\n' +
    '  npx supabase start\n\n' +
    'If Supabase is already started, make sure the API is reachable at:\n' +
    `  ${healthUrl}`
  );
}

/**
 * Seed the database with E2E test users
 */
async function seedUsers() {
  console.log('Seeding database with test users...');

  try {
    const { stdout, stderr } = await execAsync('npx tsx scripts/seed-e2e-users.ts', {
      cwd: path.resolve(__dirname, '..'),
      timeout: 30000 // 30 seconds
    });

    if (stdout) {
      console.log(stdout.trim());
    }

    if (stderr && stderr.toLowerCase().includes('error')) {
      console.warn('Seeding warnings:', stderr);
    }

    console.log('Test users seeded successfully');

  } catch (error) {
    console.error('Failed to seed test users:', error);
    throw new Error(`User seeding failed: ${error}`);
  }
}

/**
 * Create authentication state for Playwright tests
 */
async function createAuthState(config: FullConfig) {
  console.log('Creating authentication state for tests...');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: config.projects[0].use.baseURL || 'http://localhost:5173',
  });
  const page = await context.newPage();

  try {
    // Navigate to the E2E login helper page
    console.log('Authenticating test user...');
    await page.goto('/__e2e-login.html?mode=email&email=e2e@example.com&password=test1234', {
      waitUntil: 'networkidle'
    });

    // Wait for authentication to complete
    await page.waitForFunction(
      () => {
        const status = document.body.getAttribute('data-auth-status');
        return status === 'success' || status === 'error' || document.body.textContent === 'OK';
      },
      { timeout: 15000 }
    );

    // Check if authentication was successful
    const authStatus = await page.getAttribute('body', 'data-auth-status');
    const bodyText = await page.textContent('body');

    if (authStatus === 'error') {
      const errorMessage = await page.getAttribute('body', 'data-auth-message');
      throw new Error(`Authentication failed: ${errorMessage}`);
    }

    if (bodyText !== 'OK' && authStatus !== 'success') {
      throw new Error('Authentication did not complete successfully');
    }

    console.log('Test user authenticated successfully');

    // Save the authentication state
    const storageStatePath = path.resolve(__dirname, 'storageState.auth.json');
    await context.storageState({ path: storageStatePath });

    console.log(`Authentication state saved to: ${storageStatePath}`);

    // Verify the storage state file exists and has content
    const storageState = await fs.readFile(storageStatePath, 'utf8');
    const parsedState = JSON.parse(storageState);

    if (!parsedState.cookies || parsedState.cookies.length === 0) {
      console.warn('Warning: No cookies found in storage state');
    }

    if (!parsedState.origins || parsedState.origins.length === 0) {
      console.warn('Warning: No local storage data found in storage state');
    } else {
      console.log(`Saved ${parsedState.origins.length} origin(s) with local storage data`);
    }

  } catch (error) {
    console.error('Failed to create authentication state:', error);

    // Take a screenshot for debugging
    try {
      await page.screenshot({
        path: path.resolve(__dirname, 'setup-failure-screenshot.png'),
        fullPage: true
      });
      console.log('Setup failure screenshot saved');
    } catch (screenshotError) {
      console.warn('Could not take screenshot:', screenshotError);
    }

    throw error;

  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
