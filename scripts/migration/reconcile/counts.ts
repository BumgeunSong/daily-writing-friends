/**
 * Reconcile Counts
 *
 * Compares row counts between Firestore and Supabase to verify migration completeness.
 *
 * Usage:
 *   npx ts-node scripts/migration/reconcile/counts.ts
 */

import { firestore, supabase, EXPORT_DIR } from '../config';
import * as fs from 'fs';
import * as path from 'path';

interface CountResult {
  table: string;
  firestore: number;
  supabase: number;
  diff: number;
  status: 'OK' | 'MISMATCH';
}

// Count documents in a Firestore collection
async function countFirestoreCollection(collectionPath: string): Promise<number> {
  const snapshot = await firestore.collection(collectionPath).count().get();
  return snapshot.data().count;
}

// Count nested Firestore documents (posts, comments, etc.)
async function countNestedDocuments(
  parentCollection: string,
  nestedCollection: string
): Promise<number> {
  let total = 0;
  const parentsSnapshot = await firestore.collection(parentCollection).get();

  for (const parentDoc of parentsSnapshot.docs) {
    const nestedSnapshot = await firestore
      .collection(`${parentCollection}/${parentDoc.id}/${nestedCollection}`)
      .count()
      .get();
    total += nestedSnapshot.data().count;
  }

  return total;
}

// Count deeply nested documents (comments under posts under boards)
async function countDeeplyNestedDocuments(): Promise<{
  posts: number;
  comments: number;
  replies: number;
  likes: number;
  reactions: number;
}> {
  let posts = 0;
  let comments = 0;
  let replies = 0;
  let likes = 0;
  let reactions = 0;

  const boardsSnapshot = await firestore.collection('boards').get();

  for (const boardDoc of boardsSnapshot.docs) {
    const postsSnapshot = await firestore
      .collection(`boards/${boardDoc.id}/posts`)
      .get();
    posts += postsSnapshot.size;

    for (const postDoc of postsSnapshot.docs) {
      const postPath = `boards/${boardDoc.id}/posts/${postDoc.id}`;

      // Count comments
      const commentsSnapshot = await firestore
        .collection(`${postPath}/comments`)
        .get();
      comments += commentsSnapshot.size;

      // Count likes
      const likesSnapshot = await firestore
        .collection(`${postPath}/likes`)
        .count()
        .get();
      likes += likesSnapshot.data().count;

      // Count replies and reactions under comments
      for (const commentDoc of commentsSnapshot.docs) {
        const commentPath = `${postPath}/comments/${commentDoc.id}`;

        const repliesSnapshot = await firestore
          .collection(`${commentPath}/replies`)
          .get();
        replies += repliesSnapshot.size;

        // Count reactions on comment
        const commentReactionsSnapshot = await firestore
          .collection(`${commentPath}/reactions`)
          .count()
          .get();
        reactions += commentReactionsSnapshot.data().count;

        // Count reactions on replies
        for (const replyDoc of repliesSnapshot.docs) {
          const replyReactionsSnapshot = await firestore
            .collection(`${commentPath}/replies/${replyDoc.id}/reactions`)
            .count()
            .get();
          reactions += replyReactionsSnapshot.data().count;
        }
      }
    }
  }

  return { posts, comments, replies, likes, reactions };
}

// Count user notifications and blocks
async function countUserSubcollections(): Promise<{
  notifications: number;
  blocks: number;
}> {
  let notifications = 0;
  let blocks = 0;

  const usersSnapshot = await firestore.collection('users').get();

  for (const userDoc of usersSnapshot.docs) {
    const notificationsSnapshot = await firestore
      .collection(`users/${userDoc.id}/notifications`)
      .count()
      .get();
    notifications += notificationsSnapshot.data().count;

    const blockedUsersSnapshot = await firestore
      .collection(`users/${userDoc.id}/blockedUsers`)
      .count()
      .get();
    blocks += blockedUsersSnapshot.data().count;
  }

  return { notifications, blocks };
}

// Count rows in Supabase table
async function countSupabaseTable(tableName: string): Promise<number> {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error(`Error counting ${tableName}:`, error.message);
    return -1;
  }

  return count || 0;
}

// Main reconciliation function
async function main(): Promise<void> {
  console.log('=== Count Reconciliation ===\n');

  const results: CountResult[] = [];

  // Simple collections
  console.log('Counting Firestore collections...');

  const firestoreBoardsCount = await countFirestoreCollection('boards');
  const firestoreUsersCount = await countFirestoreCollection('users');

  // Nested collections (this takes a while)
  console.log('Counting nested documents (posts, comments, replies, likes, reactions)...');
  const nestedCounts = await countDeeplyNestedDocuments();

  console.log('Counting user subcollections (notifications, blocks)...');
  const userCounts = await countUserSubcollections();

  // Supabase counts
  console.log('\nCounting Supabase tables...');

  const supabaseCounts = {
    boards: await countSupabaseTable('boards'),
    users: await countSupabaseTable('users'),
    posts: await countSupabaseTable('posts'),
    comments: await countSupabaseTable('comments'),
    replies: await countSupabaseTable('replies'),
    likes: await countSupabaseTable('likes'),
    reactions: await countSupabaseTable('reactions'),
    notifications: await countSupabaseTable('notifications'),
    blocks: await countSupabaseTable('blocks'),
  };

  // Compare counts
  const comparisons: [string, number, number][] = [
    ['boards', firestoreBoardsCount, supabaseCounts.boards],
    ['users', firestoreUsersCount, supabaseCounts.users],
    ['posts', nestedCounts.posts, supabaseCounts.posts],
    ['comments', nestedCounts.comments, supabaseCounts.comments],
    ['replies', nestedCounts.replies, supabaseCounts.replies],
    ['likes', nestedCounts.likes, supabaseCounts.likes],
    ['reactions', nestedCounts.reactions, supabaseCounts.reactions],
    ['notifications', userCounts.notifications, supabaseCounts.notifications],
    ['blocks', userCounts.blocks, supabaseCounts.blocks],
  ];

  for (const [table, firestoreCount, supabaseCount] of comparisons) {
    const diff = supabaseCount - firestoreCount;
    results.push({
      table,
      firestore: firestoreCount,
      supabase: supabaseCount,
      diff,
      status: diff === 0 ? 'OK' : 'MISMATCH',
    });
  }

  // Print results
  console.log('\n=== Results ===\n');
  console.log('Table          | Firestore | Supabase | Diff   | Status');
  console.log('---------------|-----------|----------|--------|--------');

  let hasErrors = false;
  for (const result of results) {
    const status = result.status === 'OK' ? '✅' : '❌';
    console.log(
      `${result.table.padEnd(15)}| ${String(result.firestore).padEnd(10)}| ${String(result.supabase).padEnd(9)}| ${String(result.diff).padEnd(7)}| ${status}`
    );
    if (result.status === 'MISMATCH') hasErrors = true;
  }

  // Save results to file
  const outputPath = path.join(EXPORT_DIR, 'reconciliation-counts.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  if (hasErrors) {
    console.log('\n⚠️  Some counts do not match. Review the differences above.');
    process.exit(1);
  } else {
    console.log('\n✅ All counts match!');
  }
}

main().catch((error) => {
  console.error('Reconciliation failed:', error);
  process.exit(1);
});
