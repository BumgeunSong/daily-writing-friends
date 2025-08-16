import { test as base, Page } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Custom test fixtures for authentication
 * 
 * These fixtures provide additional authentication utilities
 * for tests that need special authentication scenarios.
 */

type AuthFixtures = {
  authenticatedPage: Page;
  loggedOutPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  /**
   * Page fixture with standard user authentication
   * Uses the storageState from the setup
   */
  authenticatedPage: async ({ browser }, use) => {
    const storageStatePath = path.join(__dirname, '..', 'storageState.auth.json');
    
    const context = await browser.newContext({
      storageState: storageStatePath
    });
    
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  /**
   * Page fixture with no authentication
   * Useful for testing login flows and public pages
   */
  loggedOutPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      // No storageState - starts fresh
    });
    
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  /**
   * Page fixture with admin user authentication
   * Creates a fresh admin session using custom token
   */
  adminPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // Load admin custom token
      const tokensPath = path.join(__dirname, 'auth-tokens.json');
      const tokens = JSON.parse(await fs.readFile(tokensPath, 'utf8'));
      const adminToken = tokens['e2e-admin'];
      
      if (!adminToken) {
        throw new Error('Admin token not found. Make sure to run the seed script.');
      }
      
      // Authenticate as admin using custom token
      await page.goto(`/__e2e-login.html?mode=token&token=${encodeURIComponent(adminToken)}`);
      
      // Wait for authentication
      await page.waitForFunction(
        () => document.body.textContent === 'OK',
        { timeout: 10000 }
      );
      
      // Navigate to main app
      await page.goto('/');
      
      await use(page);
      
    } finally {
      await context.close();
    }
  },
});

export { expect } from '@playwright/test';

/**
 * Utility functions for authentication in tests
 */
export class AuthUtils {
  /**
   * Sign in a user with email/password via the E2E helper
   */
  static async signInWithEmail(page: Page, email: string, password: string) {
    await page.goto(`/__e2e-login.html?mode=email&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
    
    await page.waitForFunction(
      () => {
        const status = document.body.getAttribute('data-auth-status');
        return status === 'success' || status === 'error' || document.body.textContent === 'OK';
      },
      { timeout: 15000 }
    );

    const authStatus = await page.getAttribute('body', 'data-auth-status');
    if (authStatus === 'error') {
      const errorMessage = await page.getAttribute('body', 'data-auth-message');
      throw new Error(`Authentication failed: ${errorMessage}`);
    }

    // Navigate back to main app
    await page.goto('/');
  }

  /**
   * Sign in a user with custom token via the E2E helper
   */
  static async signInWithToken(page: Page, token: string) {
    await page.goto(`/__e2e-login.html?mode=token&token=${encodeURIComponent(token)}`);
    
    await page.waitForFunction(
      () => document.body.textContent === 'OK',
      { timeout: 10000 }
    );

    // Navigate back to main app
    await page.goto('/');
  }

  /**
   * Sign out the current user
   */
  static async signOut(page: Page) {
    await page.goto('/__e2e-login.html?mode=logout');
    
    await page.waitForFunction(
      () => document.body.textContent === 'OK',
      { timeout: 10000 }
    );
  }

  /**
   * Check if a user is currently signed in
   */
  static async isSignedIn(page: Page): Promise<boolean> {
    await page.goto('/__e2e-login.html?mode=check');
    
    await page.waitForFunction(
      () => {
        const text = document.body.textContent;
        return text?.startsWith('SIGNED_IN:') || text === 'NOT_SIGNED_IN';
      },
      { timeout: 10000 }
    );

    const bodyText = await page.textContent('body');
    return bodyText?.startsWith('SIGNED_IN:') || false;
  }

  /**
   * Get current user ID if signed in
   */
  static async getCurrentUserId(page: Page): Promise<string | null> {
    await page.goto('/__e2e-login.html?mode=check');
    
    await page.waitForFunction(
      () => {
        const text = document.body.textContent;
        return text?.startsWith('SIGNED_IN:') || text === 'NOT_SIGNED_IN';
      },
      { timeout: 10000 }
    );

    const bodyText = await page.textContent('body');
    if (bodyText?.startsWith('SIGNED_IN:')) {
      return bodyText.split(':')[1];
    }
    return null;
  }
}

/**
 * Test user credentials for convenience
 */
export const TEST_USERS = {
  REGULAR: {
    email: 'e2e@example.com',
    password: 'test1234',
    uid: 'e2e-user-1'
  },
  SECOND: {
    email: 'e2e2@example.com', 
    password: 'test1234',
    uid: 'e2e-user-2'
  },
  ADMIN: {
    email: 'admin@example.com',
    password: 'admin1234', 
    uid: 'e2e-admin'
  }
};