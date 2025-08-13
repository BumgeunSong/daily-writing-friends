#!/usr/bin/env node

/**
 * Setup Firebase emulator with test-specific security rules
 * 
 * This script configures the Firebase emulators to use permissive security rules
 * for testing, while keeping production rules safe.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Check if Firebase CLI is available
 */
function checkFirebaseCLI() {
  return new Promise((resolve) => {
    const process = spawn('firebase', ['--version'], { stdio: 'ignore' });
    process.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

/**
 * Start Firebase emulators with test rules
 */
async function startEmulatorsWithTestRules() {
  const hasFirebase = await checkFirebaseCLI();
  if (!hasFirebase) {
    throw new Error('Firebase CLI not found. Please install it with: npm install -g firebase-tools');
  }

  // Check if test rules exist
  const firestoreTestRules = join(projectRoot, 'firebase', 'firestore.test.rules');
  const storageTestRules = join(projectRoot, 'firebase', 'storage.test.rules');

  if (!existsSync(firestoreTestRules)) {
    throw new Error(`Firestore test rules not found at: ${firestoreTestRules}`);
  }

  if (!existsSync(storageTestRules)) {
    throw new Error(`Storage test rules not found at: ${storageTestRules}`);
  }

  console.log('🔥 Starting Firebase emulators with test rules...');
  console.log(`   Firestore rules: ${firestoreTestRules}`);
  console.log(`   Storage rules: ${storageTestRules}`);

  // Build the firebase emulators command with test rules
  const args = [
    'emulators:start',
    '--only', 'auth,firestore,storage,functions',
    '--rules', firestoreTestRules,
    '--rules', storageTestRules,
    '--project', 'demo-project'
  ];

  // Add data import/export if emulator-data directory exists
  const emulatorDataPath = join(projectRoot, 'emulator-data');
  if (existsSync(emulatorDataPath)) {
    args.push('--import', emulatorDataPath);
    args.push('--export-on-exit', emulatorDataPath);
    console.log(`   Import/Export: ${emulatorDataPath}`);
  }

  return new Promise((resolve, reject) => {
    const process = spawn('firebase', args, {
      stdio: 'inherit',
      cwd: projectRoot
    });

    process.on('error', (error) => {
      reject(new Error(`Failed to start emulators: ${error.message}`));
    });

    // The emulators don't exit normally, so we don't wait for close event
    // Instead, we assume success after a short delay
    setTimeout(() => {
      console.log('✅ Emulators should be starting...');
      resolve(process);
    }, 2000);
  });
}

/**
 * Main function
 */
async function main() {
  try {
    await startEmulatorsWithTestRules();
  } catch (error) {
    console.error('❌ Failed to setup emulator rules:', error.message);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { startEmulatorsWithTestRules };