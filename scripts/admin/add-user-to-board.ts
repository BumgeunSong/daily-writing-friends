/**
 * Admin Script: Add User to Active Board
 *
 * Grants board write permission to a user in both Firestore and Supabase,
 * and removes them from the waiting list if present.
 *
 * Usage:
 *   npx tsx scripts/admin/add-user-to-board.ts <uid>
 *   npx tsx scripts/admin/add-user-to-board.ts <uid> --board-id <boardId>
 */

import { firestore, supabase } from '../migration/config';
import { getRemoteConfig } from 'firebase-admin/remote-config';
import { FieldValue } from 'firebase-admin/firestore';

// --- Helpers ---

async function getActiveBoardId(): Promise<string> {
  const remoteConfig = getRemoteConfig();
  const template = await remoteConfig.getTemplate();
  const param = template.parameters['active_board_id'];
  const value = param?.defaultValue && (param.defaultValue as any).value;
  if (!value) {
    throw new Error('active_board_id not found in Remote Config');
  }
  return String(value);
}

function parseArgs(): { uid: string; boardIdOverride?: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/admin/add-user-to-board.ts <uid> [--board-id <boardId>]');
    process.exit(1);
  }

  const uid = args[0];
  const boardIdIdx = args.indexOf('--board-id');
  const boardIdOverride = boardIdIdx !== -1 ? args[boardIdIdx + 1] : undefined;

  return { uid, boardIdOverride };
}

// --- Main ---

async function main() {
  const { uid, boardIdOverride } = parseArgs();

  // 1. Resolve board ID
  console.log('--- Step 1: Resolve board ID ---');
  const boardId = boardIdOverride ?? await getActiveBoardId();
  console.log(`Board ID: ${boardId}${boardIdOverride ? ' (override)' : ' (from Remote Config)'}`);

  // 2. Verify user exists
  console.log('\n--- Step 2: Verify user exists ---');
  const userDoc = await firestore.doc(`users/${uid}`).get();
  if (!userDoc.exists) {
    throw new Error(`User ${uid} does not exist in Firestore`);
  }
  const userData = userDoc.data()!;
  console.log(`User found: ${userData.nickname ?? userData.email ?? uid}`);

  // 3. Verify board exists
  console.log('\n--- Step 3: Verify board exists ---');
  const boardDoc = await firestore.doc(`boards/${boardId}`).get();
  if (!boardDoc.exists) {
    throw new Error(`Board ${boardId} does not exist in Firestore`);
  }
  const boardData = boardDoc.data()!;
  console.log(`Board found: ${boardData.title ?? boardId}`);

  // 4. Check if user already has permission
  const currentPermissions = userData.boardPermissions ?? {};
  if (currentPermissions[boardId] === 'write') {
    console.log(`\nUser already has 'write' permission for board ${boardId}. No changes needed.`);
    return;
  }

  // 5. Grant board permission in Firestore
  console.log('\n--- Step 4: Grant board permission (Firestore) ---');
  await firestore.doc(`users/${uid}`).update({
    [`boardPermissions.${boardId}`]: 'write',
  });
  console.log(`Set boardPermissions.${boardId} = 'write'`);

  // 6. Upsert into Supabase user_board_permissions
  console.log('\n--- Step 5: Grant board permission (Supabase) ---');
  const { error: permError } = await supabase
    .from('user_board_permissions')
    .upsert(
      { user_id: uid, board_id: boardId, permission: 'write' },
      { onConflict: 'user_id,board_id' }
    );
  if (permError) {
    throw new Error(`Supabase user_board_permissions upsert failed: ${permError.message}`);
  }
  console.log('Upserted user_board_permissions row');

  // 7. Remove from waiting list (Firestore)
  console.log('\n--- Step 6: Remove from waiting list ---');
  const waitingUsersIds: string[] = boardData.waitingUsersIds ?? [];
  if (waitingUsersIds.includes(uid)) {
    await firestore.doc(`boards/${boardId}`).update({
      waitingUsersIds: FieldValue.arrayRemove(uid),
    });
    console.log('Removed from Firestore waitingUsersIds');
  } else {
    console.log('Not on Firestore waiting list (skip)');
  }

  // 8. Remove from waiting list (Supabase)
  const { data: waitingRow } = await supabase
    .from('board_waiting_users')
    .select('id')
    .eq('board_id', boardId)
    .eq('user_id', uid)
    .maybeSingle();

  if (waitingRow) {
    const { error: delError } = await supabase
      .from('board_waiting_users')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', uid);
    if (delError) {
      throw new Error(`Supabase board_waiting_users delete failed: ${delError.message}`);
    }
    console.log('Removed from Supabase board_waiting_users');
  } else {
    console.log('Not on Supabase waiting list (skip)');
  }

  // 9. Confirmation
  console.log('\n========================================');
  console.log('Done! User added to board successfully.');
  console.log(`  User: ${userData.nickname ?? userData.email ?? uid} (${uid})`);
  console.log(`  Board: ${boardData.title ?? boardId} (${boardId})`);
  console.log(`  Permission: write`);
  console.log('========================================');
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
