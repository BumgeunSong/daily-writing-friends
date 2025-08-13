import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

/**
 * Global teardown for Playwright E2E tests
 * 
 * This teardown function:
 * 1. Optionally stops Firebase emulators (if not in CI)
 * 2. Cleans up temporary files
 * 3. Reports test completion
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright global teardown...');

  try {
    // Clean up temporary files
    await cleanupTempFiles();
    
    // Stop emulators in CI or if explicitly requested
    if (process.env.CI || process.env.STOP_EMULATORS_AFTER_TESTS) {
      await stopEmulators();
    } else {
      console.log('ℹ️  Leaving emulators running for faster subsequent test runs');
      console.log('   To stop emulators manually: npm run emu:stop');
      console.log('   To clear emulator data: npm run emu:clear');
    }
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown - tests have already completed
  }
}

/**
 * Clean up temporary files created during tests
 */
async function cleanupTempFiles() {
  console.log('🗑️  Cleaning up temporary files...');
  
  const tempFiles = [
    path.resolve(__dirname, 'setup-failure-screenshot.png'),
    // Add other temp files that might be created during tests
  ];
  
  for (const file of tempFiles) {
    try {
      await fs.access(file);
      await fs.unlink(file);
      console.log(`🗑️  Removed temp file: ${path.basename(file)}`);
    } catch (error) {
      // File doesn't exist, which is fine
    }
  }
}

/**
 * Stop Firebase emulators
 */
async function stopEmulators() {
  console.log('🛑 Stopping Firebase emulators...');
  
  try {
    await execAsync('npm run emu:stop', {
      cwd: path.resolve(__dirname, '..'),
      timeout: 10000 // 10 seconds timeout
    });
    
    console.log('✅ Firebase emulators stopped');
    
  } catch (error) {
    console.warn('⚠️  Could not stop emulators cleanly:', error);
    
    // Try force kill if regular stop failed
    try {
      console.log('🔨 Attempting to force kill emulator processes...');
      
      // Kill processes that might be running
      const killCommands = [
        'pkill -f "firebase.*emulators"',
        'pkill -f "java.*firestore-emulator"',
        'lsof -ti:9099 | xargs kill -9', // Auth emulator
        'lsof -ti:8080 | xargs kill -9', // Firestore emulator
        'lsof -ti:9199 | xargs kill -9', // Storage emulator
      ];
      
      for (const cmd of killCommands) {
        try {
          await execAsync(cmd);
        } catch (killError) {
          // Individual kill commands may fail, which is expected
        }
      }
      
      console.log('🔨 Force kill completed');
      
    } catch (forceKillError) {
      console.warn('⚠️  Force kill also failed:', forceKillError);
    }
  }
}

export default globalTeardown;