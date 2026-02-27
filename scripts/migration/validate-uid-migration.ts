/**
 * Phase 8 Task 2: Pre-migration validation for UID remap.
 *
 * Checks every FK column that references users(id) for:
 * - Orphan values not present in the UID mapping
 * - Empty strings that would fail UUID cast
 * - Every users.id has a mapping entry
 * - Row counts for post-migration comparison
 *
 * Usage: npx tsx scripts/migration/validate-uid-migration.ts
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

const PAGE_SIZE = 1000;

/** Fetch all non-null values for a column with pagination (Supabase default limit is 1000) */
async function fetchAllValues(table: string, column: string): Promise<string[]> {
  const allValues: string[] = [];
  let offset = 0;

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from(table) as any)
      .select(column)
      .not(column, 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const rows = data as Record<string, string>[];
    for (const row of rows) {
      allValues.push(row[column]);
    }

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allValues;
}

async function main() {
  const mappingsPath = path.join(__dirname, '../../data/uid-mappings.json');
  if (!fs.existsSync(mappingsPath)) {
    throw new Error(`Mappings file not found at ${mappingsPath}. Run create-supabase-auth-users.ts first.`);
  }

  const mappings: UidMapping[] = JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));
  const firebaseUids = new Set(mappings.map(m => m.firebase_uid));

  console.log(`Loaded ${mappings.length} mappings\n`);

  let hasErrors = false;

  // CRITICAL: Verify every users.id has a mapping entry
  console.log('--- Checking users.id coverage ---');
  const allUserIds = await fetchAllValues('users', 'id');
  const unmappedUsers = allUserIds.filter(id => !firebaseUids.has(id));
  if (unmappedUsers.length > 0) {
    console.error(`  CRITICAL: ${unmappedUsers.length} users have no UID mapping:`);
    unmappedUsers.slice(0, 10).forEach(id => console.error(`    "${id}"`));
    hasErrors = true;
  } else {
    console.log(`  ✓ All ${allUserIds.length} users have mappings`);
  }

  // Check each FK column for orphan values
  console.log('\n--- Checking FK columns for orphans ---');
  const tables = [
    { table: 'posts', column: 'author_id' },
    { table: 'comments', column: 'user_id' },
    { table: 'replies', column: 'user_id' },
    { table: 'likes', column: 'user_id' },
    { table: 'reactions', column: 'user_id' },
    { table: 'notifications', column: 'recipient_id' },
    { table: 'notifications', column: 'actor_id' },
    { table: 'drafts', column: 'user_id' },
    { table: 'user_board_permissions', column: 'user_id' },
    { table: 'board_waiting_users', column: 'user_id' },
    { table: 'blocks', column: 'blocker_id' },
    { table: 'blocks', column: 'blocked_id' },
    { table: 'users', column: 'known_buddy_uid' },
    { table: 'reviews', column: 'reviewer_id' },
  ];

  for (const { table, column } of tables) {
    try {
      const values = await fetchAllValues(table, column);
      const orphans = values.filter(v => !firebaseUids.has(v));
      const empties = values.filter(v => v === '');

      if (orphans.length > 0) {
        console.error(`  ORPHAN: ${table}.${column} has ${orphans.length} values not in mapping:`);
        const uniqueOrphans = Array.from(new Set(orphans));
        uniqueOrphans.slice(0, 10).forEach(v => console.error(`    "${v}"`));
        if (uniqueOrphans.length > 10) {
          console.error(`    ... and ${uniqueOrphans.length - 10} more`);
        }
        hasErrors = true;
      }
      if (empties.length > 0) {
        console.error(`  EMPTY: ${table}.${column} has ${empties.length} empty strings`);
        hasErrors = true;
      }

      console.log(`  ✓ ${table}.${column}: ${values.length} values, ${orphans.length} orphans, ${empties.length} empty`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR querying ${table}.${column}: ${msg}`);
      hasErrors = true;
    }
  }

  // Row counts (for post-migration comparison)
  console.log('\n--- Row counts (save for post-migration verification) ---');
  const countTables = [
    'users', 'posts', 'comments', 'replies', 'likes', 'reactions',
    'notifications', 'drafts', 'blocks', 'user_board_permissions',
    'board_waiting_users', 'reviews',
  ];

  const counts: Record<string, number> = {};
  for (const t of countTables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    counts[t] = count ?? 0;
    console.log(`  ${t}: ${count}`);
  }

  // Save counts for post-migration verification
  const countsPath = path.join(__dirname, '../../data/pre-migration-counts.json');
  fs.writeFileSync(countsPath, JSON.stringify(counts, null, 2));
  console.log(`\nSaved row counts to ${countsPath}`);

  if (hasErrors) {
    console.error('\n❌ VALIDATION FAILED — fix orphans/empties before proceeding');
    process.exit(1);
  } else {
    console.log('\n✅ All validations passed — safe to proceed with migration');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
