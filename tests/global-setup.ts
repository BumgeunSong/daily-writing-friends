import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const isProduction = process.env.E2E_ENV === 'production';

/**
 * Global setup for Playwright E2E tests
 *
 * In production mode: skips Supabase health check and user seeding
 * (production Supabase is always running and users are pre-seeded).
 *
 * In local mode: checks localhost:54321 health and runs the seed script.
 *
 * Auth state is handled separately by `auth.setup.ts` via the Playwright setup project.
 */
async function globalSetup() {
  console.log(`Starting Playwright global setup (mode: ${isProduction ? 'production' : 'local'})...`);

  if (isProduction) {
    console.log('Production mode: skipping Supabase health check and user seeding.');
    return;
  }

  if (process.env.SKIP_SEED) {
    console.log('SKIP_SEED set: skipping Supabase health check and user seeding.');
    return;
  }

  try {
    await checkSupabaseRunning();
    await seedUsers();
    console.log('Global setup completed successfully');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  }
}

/**
 * Check if Supabase local is running by polling the Auth health endpoint.
 * Does NOT attempt to start Supabase (requires Docker — start it manually).
 */
async function checkSupabaseRunning() {
  console.log('Checking if Supabase local is running...');

  const healthUrl = 'http://127.0.0.1:54321/auth/v1/health';
  const maxAttempts = 10;
  const intervalMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        console.log(`Supabase local is running at ${healthUrl}`);
        return;
      }
    } catch {
      // Not yet reachable
    }

    if (attempt < maxAttempts) {
      console.log(`Waiting for Supabase... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(
    'Supabase local is not running. Please start it before running E2E tests:\n' +
    '  npx supabase start\n\n' +
    'If Supabase is already started, make sure the API is reachable at:\n' +
    `  ${healthUrl}`
  );
}

/**
 * Seed the database with E2E test users
 */
async function seedUsers() {
  console.log('Seeding database with test users...');

  try {
    const { stdout, stderr } = await execAsync('npx tsx scripts/seed-e2e-users.ts', {
      cwd: path.resolve(__dirname, '..'),
      timeout: 30000 // 30 seconds
    });

    if (stdout) {
      console.log(stdout.trim());
    }

    if (stderr && stderr.toLowerCase().includes('error')) {
      console.warn('Seeding warnings:', stderr);
    }

    console.log('Test users seeded successfully');

  } catch (error) {
    console.error('Failed to seed test users:', error);
    throw new Error(`User seeding failed: ${error}`);
  }
}

export default globalSetup;
