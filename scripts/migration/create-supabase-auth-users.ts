/**
 * Phase 8 Task 1: Create Supabase Auth accounts for all existing users.
 *
 * Reads users from the Supabase `users` table, creates a Supabase Auth account
 * for each one, and outputs UID mapping files for the SQL migration.
 *
 * Usage: npx tsx scripts/migration/create-supabase-auth-users.ts
 */

import { supabase } from './config.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface UidMapping {
  firebase_uid: string;
  supabase_uuid: string;
  email: string;
}

async function main() {
  // 1. Fetch all users from Supabase users table
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, real_name');

  if (error) throw error;
  if (!users?.length) throw new Error('No users found');

  console.log(`Found ${users.length} users to migrate`);

  // 2. Check for users without email
  const noEmail = users.filter(u => !u.email);
  if (noEmail.length > 0) {
    console.error('Users without email:', noEmail.map(u => u.id));
    throw new Error(`${noEmail.length} users have no email — cannot create auth accounts`);
  }

  // 3. Check for duplicate emails
  const emails = users.map(u => u.email);
  const dupes = emails.filter((e, i) => emails.indexOf(e) !== i);
  if (dupes.length > 0) {
    console.error('Duplicate emails:', dupes);
    throw new Error(`${dupes.length} duplicate emails found`);
  }

  // 4. Fetch all existing auth users once (avoid O(n²) per-iteration lookup)
  const existingAuthUsers = new Map<string, string>();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (listError) throw listError;
    for (const au of authUsers) {
      if (au.email) existingAuthUsers.set(au.email, au.id);
    }
    if (authUsers.length < perPage) break;
    page++;
  }
  console.log(`Found ${existingAuthUsers.size} existing auth accounts`);

  // 5. Create Supabase Auth accounts
  const mappings: UidMapping[] = [];
  const errors: Array<{ firebase_uid: string; email: string; error: string }> = [];

  for (const user of users) {
    const existing = existingAuthUsers.get(user.email);

    if (existing) {
      console.log(`  Auth account already exists for ${user.email} → ${existing}`);
      mappings.push({
        firebase_uid: user.id,
        supabase_uuid: existing,
        email: user.email,
      });
      continue;
    }

    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: { full_name: user.real_name },
    });

    if (createError) {
      console.error(`  FAILED: ${user.email} — ${createError.message}`);
      errors.push({ firebase_uid: user.id, email: user.email, error: createError.message });
      continue;
    }

    console.log(`  Created: ${user.email} → ${data.user.id}`);
    mappings.push({
      firebase_uid: user.id,
      supabase_uuid: data.user.id,
      email: user.email,
    });
  }

  // 6. Save mappings
  const outputPath = path.join(__dirname, '../../data/uid-mappings.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(mappings, null, 2));
  console.log(`\nSaved ${mappings.length} mappings to ${outputPath}`);

  if (errors.length > 0) {
    console.error(`\n${errors.length} ERRORS:`);
    errors.forEach(e => console.error(`  ${e.email}: ${e.error}`));
    process.exit(1);
  }

  // 7. Generate SQL INSERT for uid_mapping table
  const sqlPath = path.join(__dirname, '../../data/uid-mapping-inserts.sql');
  const sqlLines = mappings.map(m =>
    `('${m.firebase_uid}', '${m.supabase_uuid}')`
  );
  const sql = `INSERT INTO uid_mapping (firebase_uid, supabase_uuid) VALUES\n${sqlLines.join(',\n')};\n`;
  fs.writeFileSync(sqlPath, sql);
  console.log(`Generated SQL insert at ${sqlPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
