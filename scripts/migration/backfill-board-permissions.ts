/**
 * Backfill: Sync all Firestore boardPermissions → Supabase user_board_permissions
 *
 * Safe to run multiple times (uses upsert with onConflict).
 * Usage: npx tsx scripts/migration/backfill-board-permissions.ts
 */
import { firestore, supabase, BATCH_SIZE } from './config.js';

async function main() {
  console.log('=== Backfill: boardPermissions → user_board_permissions ===\n');

  // 1. Read all Firestore users
  const usersSnap = await firestore.collection('users').get();
  console.log(`Firestore users: ${usersSnap.size}`);

  // 2. Build permission rows
  const permRows: { user_id: string; board_id: string; permission: string }[] = [];

  for (const doc of usersSnap.docs) {
    const uid = doc.id;
    const data = doc.data();
    const boardPerms: Record<string, string> = data.boardPermissions || {};

    for (const [boardId, permission] of Object.entries(boardPerms)) {
      permRows.push({ user_id: uid, board_id: boardId, permission });
    }
  }

  console.log(`Total permission rows to upsert: ${permRows.length}`);

  // 3. Upsert in batches
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < permRows.length; i += BATCH_SIZE) {
    const batch = permRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('user_board_permissions')
      .upsert(batch, { onConflict: 'user_id,board_id', ignoreDuplicates: false });

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error.message);
      errors += batch.length;
    } else {
      upserted += batch.length;
    }
  }

  console.log(`\n--- Results ---`);
  console.log(`Upserted: ${upserted}`);
  console.log(`Errors: ${errors}`);

  // 4. Verify
  const { count } = await supabase
    .from('user_board_permissions')
    .select('*', { count: 'exact', head: true });
  console.log(`\nSupabase user_board_permissions total rows after backfill: ${count}`);
}

main().catch(console.error).finally(() => process.exit(0));
