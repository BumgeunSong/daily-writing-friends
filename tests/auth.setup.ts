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
  const email = process.env.E2E_REGULAR_EMAIL ?? 'e2e@example.com';
  const password = process.env.E2E_REGULAR_PASSWORD ?? 'test1234';

  await authenticateAndSaveState(email, password, authFile);
});
