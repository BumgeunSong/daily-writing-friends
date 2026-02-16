/**
 * Debug script: Compare boardPermissions in Firestore vs Supabase user_board_permissions
 * Usage: npx tsx scripts/debug/verify-board-permissions.ts
 */
import { firestore, supabase } from '../migration/config.js';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  console.log('=== Verification: boardPermissions Firestore vs Supabase ===\n');

  // 1. Count rows in user_board_permissions (service role key)
  const { count: ubpCount, error: countErr } = await supabase
    .from('user_board_permissions')
    .select('*', { count: 'exact', head: true });
  console.log(`Supabase user_board_permissions rows: ${ubpCount ?? 'ERROR: ' + countErr?.message}`);

  // 2. Count users in Supabase
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  console.log(`Supabase users rows: ${userCount}`);

  // 3. Get all Supabase permissions (service role)
  const { data: supaPerms, error: permErr } = await supabase
    .from('user_board_permissions')
    .select('user_id, board_id, permission');
  if (permErr) {
    console.error('Error fetching Supabase permissions:', permErr);
    return;
  }

  const supaPermMap = new Map<string, Map<string, string>>();
  for (const p of supaPerms || []) {
    if (!supaPermMap.has(p.user_id)) supaPermMap.set(p.user_id, new Map());
    supaPermMap.get(p.user_id)!.set(p.board_id, p.permission);
  }
  console.log(`Supabase users with permissions: ${supaPermMap.size}`);

  // 4. Get all Firestore users with boardPermissions
  const usersSnap = await firestore.collection('users').get();
  console.log(`Firestore users count: ${usersSnap.size}\n`);

  let missingInSupabase = 0;
  let mismatchCount = 0;
  let matchCount = 0;
  const examples: string[] = [];

  for (const doc of usersSnap.docs) {
    const uid = doc.id;
    const data = doc.data();
    const firestorePerms: Record<string, string> = data.boardPermissions || {};
    const supaPermsForUser = supaPermMap.get(uid);

    for (const [boardId, permission] of Object.entries(firestorePerms)) {
      const supaPerm = supaPermsForUser?.get(boardId);
      if (!supaPerm) {
        missingInSupabase++;
        if (examples.length < 10) {
          examples.push(`  MISSING: user=${uid}, board=${boardId}, firestore=${permission}, supabase=<none>`);
        }
      } else if (supaPerm !== permission) {
        mismatchCount++;
        if (examples.length < 10) {
          examples.push(`  MISMATCH: user=${uid}, board=${boardId}, firestore=${permission}, supabase=${supaPerm}`);
        }
      } else {
        matchCount++;
      }
    }
  }

  console.log('--- Comparison Results ---');
  console.log(`Matching permissions: ${matchCount}`);
  console.log(`Missing in Supabase: ${missingInSupabase}`);
  console.log(`Mismatched values: ${mismatchCount}`);

  if (examples.length > 0) {
    console.log(`\nExamples (first ${examples.length}):`);
    examples.forEach(e => console.log(e));
  }

  // 5. Count users in Supabase with zero permissions
  const allSupaUserIds = new Set<string>();
  const { data: allUsers } = await supabase.from('users').select('id');
  for (const u of allUsers || []) allSupaUserIds.add(u.id);
  const usersWithPerms = new Set(supaPermMap.keys());
  const usersWithoutPermsCount = [...allSupaUserIds].filter(id => !usersWithPerms.has(id)).length;
  console.log(`\nSupabase users with NO permissions at all: ${usersWithoutPermsCount}`);

  // 6. Test anon key access (RLS check)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (supabaseUrl && anonKey) {
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: anonPerms, error: anonErr } = await anonClient
      .from('user_board_permissions')
      .select('user_id, board_id, permission')
      .limit(5);
    console.log(`\n--- Anon key RLS test ---`);
    if (anonErr) {
      console.log(`Anon key query ERROR: ${anonErr.message} (code: ${anonErr.code})`);
      console.log('⚠️  RLS is blocking anon key access!');
    } else {
      console.log(`Anon key returned ${anonPerms?.length ?? 0} rows (limit 5)`);
      if (anonPerms && anonPerms.length === 0) {
        console.log('⚠️  ANON KEY RETURNS 0 ROWS — RLS is likely enabled without SELECT policy!');
      } else {
        console.log('✅ Anon key can read user_board_permissions (RLS not blocking)');
      }
    }

    // Also test users table with anon key
    const { data: anonUsers, error: anonUsersErr } = await anonClient
      .from('users')
      .select('id')
      .limit(3);
    if (anonUsersErr) {
      console.log(`Anon key users query ERROR: ${anonUsersErr.message}`);
    } else {
      console.log(`Anon key users table: ${anonUsers?.length ?? 0} rows (limit 3)`);
      if (anonUsers && anonUsers.length === 0) {
        console.log('⚠️  ANON KEY RETURNS 0 ROWS for users table too!');
      }
    }
  } else {
    console.log('\n⚠️  Cannot test anon key: VITE_SUPABASE_ANON_KEY not set');
  }
}

main().catch(console.error).finally(() => process.exit(0));
