import { test as setup } from '@playwright/test';
import path from 'path';
import { authenticateAndSaveState } from './utils/supabase-auth';

/**
 * Authentication setup for Playwright tests
 *
 * Authenticates via Supabase GoTrue REST API (Node-side, no browser).
 * Writes a Playwright-compatible storageState file that other tests reuse.
 */

const authFile = path.join(__dirname, 'storageState.auth.json');

setup('authenticate', async () => {
  const isProduction = process.env.E2E_ENV === 'production';
  const email = process.env.E2E_REGULAR_EMAIL ?? (isProduction ? undefined : 'e2e@example.com');
  const password = process.env.E2E_REGULAR_PASSWORD ?? (isProduction ? undefined : 'test1234');
  if (!email || !password) {
    throw new Error('E2E_REGULAR_EMAIL and E2E_REGULAR_PASSWORD must be set when E2E_ENV=production');
  }

  await authenticateAndSaveState(email, password, authFile);
});
