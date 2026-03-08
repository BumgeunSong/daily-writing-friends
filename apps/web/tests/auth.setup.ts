import { test as setup, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Authentication setup for Playwright tests
 * 
 * This setup runs before the main tests and creates an authenticated
 * browser session that other tests can reuse via storageState.
 */

const authFile = path.join(__dirname, 'storageState.auth.json');

setup('authenticate', async ({ page, baseURL }) => {
  console.log('🔑 Setting up authentication for tests...');

  // Navigate to the E2E login helper
  await page.goto('/__e2e-login.html?mode=email&email=e2e@example.com&password=test1234');

  // Wait for authentication to complete
  await page.waitForFunction(
    () => {
      const status = document.body.getAttribute('data-auth-status');
      return status === 'success' || status === 'error' || document.body.textContent === 'OK';
    },
    { timeout: 15000 }
  );

  // Verify authentication was successful
  const authStatus = await page.getAttribute('body', 'data-auth-status');
  const bodyText = await page.textContent('body');

  if (authStatus === 'error') {
    const errorMessage = await page.getAttribute('body', 'data-auth-message');
    throw new Error(`Authentication setup failed: ${errorMessage}`);
  }

  expect(bodyText).toBe('OK');
  console.log('✅ Authentication successful');

  // Navigate to the main app to initialize Firebase client state
  await page.goto('/');
  
  // Wait for Firebase to initialize and user to be loaded
  // This ensures localStorage and cookies are properly set
  await page.waitForTimeout(2000);
  
  // Verify we're authenticated in the main app
  // You might need to adjust this selector based on your app's UI
  // await expect(page.locator('[data-testid="user-profile"]')).toBeVisible({ timeout: 10000 });

  // Save the authentication state
  await page.context().storageState({ path: authFile });
  console.log(`💾 Authentication state saved to: ${authFile}`);

  // Verify the auth file was created and has content
  const authFileStats = await fs.stat(authFile);
  expect(authFileStats.size).toBeGreaterThan(0);

  const authData = JSON.parse(await fs.readFile(authFile, 'utf8'));
  console.log(`📊 Auth state contains ${authData.cookies?.length || 0} cookies and ${authData.origins?.length || 0} origins`);
});