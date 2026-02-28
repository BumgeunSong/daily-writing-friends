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
 * 1. Ensures Firebase emulators are running
 * 2. Seeds the Auth emulator with test users
 * 3. Sets up authentication state for tests
 * 4. Verifies the Vite dev server is accessible
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...');

  try {
    // Check if emulators are already running
    await checkEmulatorsRunning();
    
    // Seed the auth emulator with test users
    await seedAuthEmulator();
    
    // Create authentication state for tests
    await createAuthState(config);
    
    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Check if Firebase emulators are running
 */
async function checkEmulatorsRunning() {
  console.log('🔍 Checking if Firebase emulators are running...');
  
  const checkUrl = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ ${name} emulator is running at ${url}`);
        return true;
      }
    } catch (error) {
      // Emulator not running
    }
    return false;
  };

  const authRunning = await checkUrl('http://localhost:9099', 'Auth');
  const firestoreRunning = await checkUrl('http://localhost:8080', 'Firestore');
  const storageRunning = await checkUrl('http://localhost:9199', 'Storage');

  if (!authRunning || !firestoreRunning || !storageRunning) {
    console.log('⚠️  Some emulators are not running. Attempting to start them...');
    
    // Try to start emulators
    try {
      console.log('🔥 Starting Firebase emulators...');
      
      // Start emulators in the background
      const child = exec('npm run emu:start', {
        cwd: path.resolve(__dirname, '..')
      });

      // Wait a bit for emulators to start
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check again
      const authRunning2 = await checkUrl('http://localhost:9099', 'Auth');
      const firestoreRunning2 = await checkUrl('http://localhost:8080', 'Firestore');
      
      if (!authRunning2 || !firestoreRunning2) {
        throw new Error('Failed to start emulators automatically');
      }
      
    } catch (error) {
      throw new Error(
        'Firebase emulators are not running. Please start them manually:\n' +
        '  npm run emu:start\n' +
        'Or run the full E2E setup:\n' +
        '  npm run e2e:setup\n\n' +
        `Error: ${error}`
      );
    }
  }
}

/**
 * Seed the Auth emulator with test users
 */
async function seedAuthEmulator() {
  console.log('🌱 Seeding Auth emulator with test users...');
  
  try {
    const { stdout, stderr } = await execAsync('npm run emu:seed', {
      cwd: path.resolve(__dirname, '..'),
      timeout: 30000 // 30 seconds timeout
    });
    
    if (stderr && stderr.includes('error')) {
      console.warn('⚠️  Seeding warnings:', stderr);
    }
    
    console.log('✅ Auth emulator seeded successfully');
    
  } catch (error) {
    console.error('❌ Failed to seed Auth emulator:', error);
    throw new Error(`Auth emulator seeding failed: ${error}`);
  }
}

/**
 * Create authentication state for Playwright tests
 */
async function createAuthState(config: FullConfig) {
  console.log('🔐 Creating authentication state for tests...');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: config.projects[0].use.baseURL || 'http://localhost:5173',
  });
  const page = await context.newPage();

  try {
    // Navigate to the E2E login helper page
    console.log('🔑 Authenticating test user...');
    await page.goto('/__e2e-login.html?mode=email&email=e2e@example.com&password=test1234', {
      waitUntil: 'networkidle'
    });

    // Wait for authentication to complete
    await page.waitForFunction(
      () => {
        const status = document.body.getAttribute('data-auth-status');
        const message = document.body.getAttribute('data-auth-message');
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

    console.log('✅ Test user authenticated successfully');

    // Save the authentication state
    const storageStatePath = path.resolve(__dirname, 'storageState.auth.json');
    await context.storageState({ path: storageStatePath });
    
    console.log(`💾 Authentication state saved to: ${storageStatePath}`);

    // Verify the storage state file exists and has content
    const storageState = await fs.readFile(storageStatePath, 'utf8');
    const parsedState = JSON.parse(storageState);
    
    if (!parsedState.cookies || parsedState.cookies.length === 0) {
      console.warn('⚠️  Warning: No cookies found in storage state');
    }
    
    if (!parsedState.origins || parsedState.origins.length === 0) {
      console.warn('⚠️  Warning: No local storage data found in storage state');
    } else {
      console.log(`📊 Saved ${parsedState.origins.length} origin(s) with local storage data`);
    }

  } catch (error) {
    console.error('❌ Failed to create authentication state:', error);
    
    // Take a screenshot for debugging
    try {
      await page.screenshot({ 
        path: path.resolve(__dirname, 'setup-failure-screenshot.png'),
        fullPage: true 
      });
      console.log('📸 Setup failure screenshot saved');
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