/**
 * Import to Postgres (Supabase)
 *
 * Imports exported Firestore JSON data into Supabase Postgres.
 *
 * Usage:
 *   npx ts-node scripts/migration/import-to-postgres.ts
 *
 * Prerequisites:
 *   - Run export-firestore.ts first to generate JSON files
 *   - Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { supabase, BATCH_SIZE, EXPORT_DIR } from './config';
import * as fs from 'fs';
import * as path from 'path';

// Read JSON file
function readJsonFile<T>(filename: string): T[] {
  const filePath = path.join(EXPORT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

// Import data in batches with upsert
async function importTable<T extends Record<string, unknown>>(
  tableName: string,
  data: T[],
  conflictColumn: string = 'id'
): Promise<{ inserted: number; errors: number }> {
  console.log(`\nImporting ${data.length} records to ${tableName}...`);

  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: conflictColumn, ignoreDuplicates: false });

    if (error) {
      console.error(`  Error in batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    // Progress indicator
    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= data.length) {
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, data.length)}/${data.length}`);
    }
  }

  console.log(`  Completed: ${inserted} inserted, ${errors} errors`);
  return { inserted, errors };
}

// Import users and extract board permissions
async function importUsersAndPermissions(): Promise<void> {
  interface UserWithPermissions {
    id: string;
    _board_permissions?: Record<string, string>;
    [key: string]: unknown;
  }

  const users = readJsonFile<UserWithPermissions>('users.json');

  // Separate users from permissions
  const cleanUsers: Record<string, unknown>[] = [];
  const permissions: { user_id: string; board_id: string; permission: string }[] = [];

  for (const user of users) {
    const { _board_permissions, ...userData } = user;
    cleanUsers.push(userData);

    if (_board_permissions) {
      for (const [boardId, permission] of Object.entries(_board_permissions)) {
        permissions.push({
          user_id: user.id,
          board_id: boardId,
          permission: permission,
        });
      }
    }
  }

  // Import users first
  await importTable('users', cleanUsers, 'id');

  // Import permissions (needs both users and boards to exist)
  if (permissions.length > 0) {
    console.log(`\nImporting ${permissions.length} user_board_permissions...`);
    await importTable('user_board_permissions', permissions, 'user_id,board_id');
  }
}

// Update comment reply counts based on actual replies
async function updateCommentReplyCounts(): Promise<void> {
  console.log('\nUpdating comment reply counts...');

  const { error } = await supabase.rpc('update_comment_reply_counts');

  if (error) {
    // If RPC doesn't exist, do it with a raw SQL approach
    console.log('  RPC not available, skipping count update (will be done manually)');
    return;
  }

  console.log('  Reply counts updated');
}

// Main import function
async function main(): Promise<void> {
  console.log('=== Supabase Import Started ===');
  console.log(`Reading from: ${EXPORT_DIR}\n`);

  // Check if export files exist
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`Export directory not found: ${EXPORT_DIR}`);
    console.error('Run export-firestore.ts first');
    process.exit(1);
  }

  // Import order matters due to foreign key constraints:
  // 1. boards (no dependencies)
  // 2. users (no dependencies)
  // 3. user_board_permissions (depends on users, boards)
  // 4. posts (depends on boards, users)
  // 5. comments (depends on posts, users)
  // 6. replies (depends on comments, users)
  // 7. likes (depends on posts, users)
  // 8. reactions (depends on users)
  // 9. blocks (depends on users)
  // 10. notifications (depends on users)

  const results: Record<string, { inserted: number; errors: number }> = {};

  // 1. Import boards
  const boards = readJsonFile<Record<string, unknown>>('boards.json');
  results.boards = await importTable('boards', boards, 'id');

  // 2. Import users and permissions
  await importUsersAndPermissions();

  // 3. Import posts
  const posts = readJsonFile<Record<string, unknown>>('posts.json');
  results.posts = await importTable('posts', posts, 'id');

  // 4. Import comments
  const comments = readJsonFile<Record<string, unknown>>('comments.json');
  results.comments = await importTable('comments', comments, 'id');

  // 5. Import replies
  const replies = readJsonFile<Record<string, unknown>>('replies.json');
  results.replies = await importTable('replies', replies, 'id');

  // 6. Import likes
  const likes = readJsonFile<Record<string, unknown>>('likes.json');
  results.likes = await importTable('likes', likes, 'id');

  // 7. Import reactions
  const reactions = readJsonFile<Record<string, unknown>>('reactions.json');
  results.reactions = await importTable('reactions', reactions, 'id');

  // 8. Import blocks
  const blocks = readJsonFile<Record<string, unknown>>('blocks.json');
  if (blocks.length > 0) {
    // Add generated IDs for blocks since they don't have Firestore IDs
    const blocksWithIds = blocks.map((block, index) => ({
      ...block,
      id: `block_${Date.now()}_${index}`,
    }));
    results.blocks = await importTable('blocks', blocksWithIds, 'id');
  }

  // 9. Import notifications
  const notifications = readJsonFile<Record<string, unknown>>('notifications.json');
  results.notifications = await importTable('notifications', notifications, 'id');

  // Update calculated fields
  await updateCommentReplyCounts();

  // Summary
  console.log('\n=== Import Summary ===');
  console.log('Table               | Inserted | Errors');
  console.log('--------------------|----------|-------');
  for (const [table, result] of Object.entries(results)) {
    console.log(
      `${table.padEnd(20)}| ${String(result.inserted).padEnd(9)}| ${result.errors}`
    );
  }

  console.log('\n=== Supabase Import Completed ===');
}

main().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
