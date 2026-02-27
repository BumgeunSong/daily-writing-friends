/**
 * Phase 8 Task 2: Pre-migration validation for UID remap.
 *
 * Checks every FK column that references users(id) for:
 * - Orphan values not present in the UID mapping
 * - Empty strings that would fail UUID cast
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

async function main() {
  const mappingsPath = path.join(__dirname, '../../data/uid-mappings.json');
  if (!fs.existsSync(mappingsPath)) {
    throw new Error(`Mappings file not found at ${mappingsPath}. Run create-supabase-auth-users.ts first.`);
  }

  const mappings: UidMapping[] = JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));
  const firebaseUids = new Set(mappings.map(m => m.firebase_uid));

  console.log(`Loaded ${mappings.length} mappings\n`);

  // Check each table for orphan user_id values
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

  let hasErrors = false;

  for (const { table, column } of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from(table) as any)
      .select(column)
      .not(column, 'is', null);

    if (error) {
      console.error(`  ERROR querying ${table}.${column}: ${error.message}`);
      hasErrors = true;
      continue;
    }

    const rows = data as Record<string, string>[];
    const values = rows.map(row => row[column]);
    const orphans = values.filter(v => !firebaseUids.has(v));
    const empties = values.filter(v => v === '');

    if (orphans.length > 0) {
      console.error(`  ORPHAN: ${table}.${column} has ${orphans.length} values not in mapping:`);
      const uniqueOrphans = Array.from(new Set(orphans));
      uniqueOrphans.slice(0, 10).forEach((v: string) => console.error(`    "${v}"`));
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
