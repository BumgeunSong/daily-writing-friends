#!/usr/bin/env npx tsx

/**
 * Seed Supabase local auth with test users for E2E testing.
 *
 * Creates users via the Supabase Admin API (service_role key)
 * and upserts matching rows in public.users.
 *
 * Usage:
 *   npx tsx scripts/seed-e2e-users.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  // Default local dev service_role key (not a secret — deterministic for local dev)
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

interface TestUser {
  email: string;
  password: string;
  displayName: string;
  role: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'e2e@example.com',
    password: 'test1234',
    displayName: 'E2E Test User',
    role: 'user',
  },
  {
    email: 'e2e2@example.com',
    password: 'test1234',
    displayName: 'E2E Test User 2',
    role: 'user',
  },
  {
    email: 'admin@example.com',
    password: 'admin1234',
    displayName: 'E2E Admin User',
    role: 'admin',
  },
];

async function adminFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      ...options.headers,
    },
  });
  return res;
}

async function createOrGetUser(user: TestUser): Promise<string> {
  // Try to create the user
  const createRes = await adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.displayName,
      },
    }),
  });

  if (createRes.ok) {
    const data = await createRes.json();
    console.log(`  Created auth user: ${user.email} (${data.id})`);
    return data.id;
  }

  // User likely exists — look them up
  const listRes = await adminFetch('/auth/v1/admin/users');
  if (!listRes.ok) {
    throw new Error(`Failed to list users: ${listRes.status} ${await listRes.text()}`);
  }
  const listData = await listRes.json();
  const existing = listData.users?.find((u: { email: string }) => u.email === user.email);

  if (existing) {
    // Update password to ensure it matches
    const updateRes = await adminFetch(`/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.displayName,
        },
      }),
    });
    if (!updateRes.ok) {
      console.warn(`  Warning: could not update user ${user.email}: ${await updateRes.text()}`);
    }
    console.log(`  Existing auth user: ${user.email} (${existing.id})`);
    return existing.id;
  }

  throw new Error(`Failed to create or find user ${user.email}: ${await createRes.text()}`);
}

async function upsertPublicUser(uid: string, user: TestUser) {
  const res = await adminFetch('/rest/v1/users', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: uid,
      email: user.email,
      real_name: user.displayName,
      nickname: user.displayName,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`  Warning: could not upsert public.users for ${user.email}: ${text}`);
  } else {
    console.log(`  Upserted public.users row for ${user.email}`);
  }
}

async function waitForSupabase(maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/health`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Supabase not ready at ${SUPABASE_URL} after ${maxRetries}s`);
}

async function main() {
  console.log('Seeding E2E test users into Supabase local...\n');

  await waitForSupabase();
  console.log('Supabase is ready.\n');

  const userIds: Record<string, string> = {};

  for (const user of TEST_USERS) {
    const uid = await createOrGetUser(user);
    userIds[user.email] = uid;
    await upsertPublicUser(uid, user);
  }

  console.log('\nSeeding complete. User IDs:');
  for (const [email, uid] of Object.entries(userIds)) {
    console.log(`  ${email} -> ${uid}`);
  }

  // Write user IDs to a JSON file for Playwright fixtures to reference
  const fs = await import('fs/promises');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outPath = path.join(__dirname, '..', 'tests', 'fixtures', 'e2e-users.json');
  await fs.writeFile(outPath, JSON.stringify(userIds, null, 2));
  console.log(`\nUser IDs saved to ${outPath}`);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
