import { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Global teardown for Playwright E2E tests
 *
 * - Production (E2E_ENV=production): skipped — teardown is handled by prod.teardown.ts
 * - Local: cleans up temp files; Supabase is stopped manually via `npx supabase stop`
 */
async function globalTeardown(_config: FullConfig) {
  const isProduction = process.env.E2E_ENV === 'production';

  if (isProduction) {
    console.log('Skipping global teardown in production environment.');
    return;
  }

  console.log('Starting Playwright global teardown...');

  try {
    await cleanupTempFiles();

    console.log('Global teardown completed.');
    console.log('  Supabase is stopped manually: npx supabase stop');
  } catch (error) {
    console.error('Global teardown failed:', error);
    // Don't throw in teardown — tests have already completed
  }
}

/**
 * Clean up temporary files created during tests
 */
async function cleanupTempFiles() {
  const tempFiles = [
    path.resolve(__dirname, 'setup-failure-screenshot.png'),
  ];

  for (const file of tempFiles) {
    try {
      await fs.access(file);
      await fs.unlink(file);
      console.log(`  Removed temp file: ${path.basename(file)}`);
    } catch {
      // File doesn't exist — nothing to remove
    }
  }
}

export default globalTeardown;
