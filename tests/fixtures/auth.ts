import { test as base, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  getSupabaseEnv,
  authenticateViaRest,
  buildStorageState,
  getStorageKey,
} from '../utils/supabase-auth';

/**
 * Custom test fixtures for authentication
 *
 * These fixtures provide additional authentication utilities
 * for tests that need special authentication scenarios.
 * Uses Supabase email/password authentication via the GoTrue REST API.
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
    // Explicitly pass empty storageState to override the project-level default
    // (the chromium project sets storageState: './tests/storageState.auth.json')
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  /**
   * Page fixture with admin user authentication
   * Authenticates via GoTrue REST API and injects session into browser context
   */
  adminPage: async ({ browser }, use) => {
    const { supabaseUrl, anonKey, baseURL } = getSupabaseEnv();
    const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
    const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? 'admin1234';

    const session = await authenticateViaRest(supabaseUrl, anonKey, adminEmail, adminPassword);
    const storageState = buildStorageState(supabaseUrl, baseURL, session);

    const context = await browser.newContext({ storageState });
    const page = await context.newPage();

    try {
      await use(page);
    } finally {
      await context.close();
    }
  },
});

export { expect } from '@playwright/test';

/**
 * Utility functions for Supabase authentication in tests
 */
export class AuthUtils {
  /**
   * Ensure the page is on the app's origin so localStorage is accessible.
   */
  private static async ensureOnOrigin(page: Page) {
    const url = page.url();
    if (url === 'about:blank' || url === '') {
      const { baseURL } = getSupabaseEnv();
      // Intercept the request to serve a blank page instead of the SPA.
      // This gives us access to localStorage on the right origin
      // without triggering Supabase SDK initialization.
      await page.route('**/__e2e-noop', (route) =>
        route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' })
      );
      await page.goto(`${baseURL}/__e2e-noop`, { waitUntil: 'load' });
    }
  }

  /**
   * Sign in a user with email/password via the GoTrue REST API,
   * then inject the session into the page's localStorage.
   */
  static async signInWithEmail(page: Page, email: string, password: string) {
    const { supabaseUrl, anonKey, baseURL } = getSupabaseEnv();
    const session = await authenticateViaRest(supabaseUrl, anonKey, email, password);
    const storageState = buildStorageState(supabaseUrl, baseURL, session);

    await AuthUtils.ensureOnOrigin(page);

    const origin = storageState.origins[0];
    const { name, value } = origin.localStorage[0];

    await page.evaluate(
      ({ key, val }) => {
        localStorage.setItem(key, val);
      },
      { key: name, val: value }
    );

    // Reload to pick up the new session
    await page.reload();
  }

  /**
   * Sign out the current user by clearing the Supabase auth token from localStorage
   */
  static async signOut(page: Page) {
    await AuthUtils.ensureOnOrigin(page);
    const { supabaseUrl } = getSupabaseEnv();
    const storageKey = getStorageKey(supabaseUrl);

    await page.evaluate((key) => {
      localStorage.removeItem(key);
    }, storageKey);
  }

  /**
   * Check if a user is currently signed in by inspecting localStorage
   */
  static async isSignedIn(page: Page): Promise<boolean> {
    await AuthUtils.ensureOnOrigin(page);
    const { supabaseUrl } = getSupabaseEnv();
    const storageKey = getStorageKey(supabaseUrl);

    return page.evaluate((key) => {
      return localStorage.getItem(key) !== null;
    }, storageKey);
  }

  /**
   * Get the current user's ID from the Supabase auth token in localStorage
   */
  static async getCurrentUserId(page: Page): Promise<string | null> {
    await AuthUtils.ensureOnOrigin(page);
    const { supabaseUrl } = getSupabaseEnv();
    const storageKey = getStorageKey(supabaseUrl);

    return page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { user?: { id?: string } };
        return parsed?.user?.id ?? null;
      } catch {
        return null;
      }
    }, storageKey);
  }
}

/**
 * Load user UUIDs from the e2e-users.json file generated by the seed script.
 * Returns an empty object if the file does not exist yet.
 */
function loadE2EUserIds(): Record<string, string> {
  try {
    const filePath = path.join(__dirname, 'e2e-users.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

const _userIds = loadE2EUserIds();

/**
 * Test user credentials for convenience.
 * UIDs are loaded dynamically from tests/fixtures/e2e-users.json
 * which is generated by the seed script.
 * Emails and passwords support env var overrides.
 */
export const TEST_USERS = {
  REGULAR: {
    email: process.env.E2E_REGULAR_EMAIL ?? 'e2e@example.com',
    password: process.env.E2E_REGULAR_PASSWORD ?? 'test1234',
    uid: _userIds[process.env.E2E_REGULAR_EMAIL ?? 'e2e@example.com'] ?? ''
  },
  SECOND: {
    email: process.env.E2E_SECOND_EMAIL ?? 'e2e2@example.com',
    password: process.env.E2E_SECOND_PASSWORD ?? 'test1234',
    uid: _userIds[process.env.E2E_SECOND_EMAIL ?? 'e2e2@example.com'] ?? ''
  },
  ADMIN: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'admin1234',
    uid: _userIds[process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com'] ?? ''
  }
};
