import { test as teardown } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Authentication teardown for Playwright tests
 * 
 * This cleanup runs after tests complete and removes
 * temporary authentication files.
 */

teardown('cleanup auth', async ({ }) => {
  console.log('🧹 Cleaning up authentication files...');

  const filesToClean = [
    path.join(__dirname, 'storageState.auth.json'),
    path.join(__dirname, 'setup-failure-screenshot.png'),
  ];

  for (const file of filesToClean) {
    try {
      await fs.access(file);
      await fs.unlink(file);
      console.log(`🗑️  Removed: ${path.basename(file)}`);
    } catch (error) {
      // File doesn't exist, which is fine
    }
  }

  console.log('✅ Authentication cleanup completed');
});