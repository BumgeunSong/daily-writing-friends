/**
 * Backfill Gap
 *
 * Finds and migrates records created between the initial Firestore export
 * and when dual-write starts. This ensures Supabase has complete data.
 *
 * Usage:
 *   npx tsx scripts/migration/backfill-gap.ts [--dry-run]
 *
 * Options:
 *   --dry-run  Show what would be migrated without actually inserting
 */

import { firestore, supabase, BATCH_SIZE } from './config';
import { Timestamp } from 'firebase-admin/firestore';

// Timestamp when export-firestore.ts completed
const EXPORT_COMPLETED_AT = new Date('2026-01-15T12:52:00Z'); // UTC (21:52 KST)

interface GapRecord {
  id: string;
  data: Record<string, unknown>;
}

interface GapSummary {
  collection: string;
  firestoreCount: number;
  missingInSupabase: number;
  inserted: number;
  errors: number;
}

// --- Query Functions ---

async function findRecentUsers(): Promise<GapRecord[]> {
  const snapshot = await firestore
    .collection('users')
    .where('updatedAt', '>', Timestamp.fromDate(EXPORT_COMPLETED_AT))
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: mapUserToSupabase(doc.id, doc.data()),
  }));
}

async function findRecentPosts(): Promise<GapRecord[]> {
  const records: GapRecord[] = [];
  const boardsSnapshot = await firestore.collection('boards').get();

  for (const boardDoc of boardsSnapshot.docs) {
    const postsSnapshot = await firestore
      .collection(`boards/${boardDoc.id}/posts`)
      .where('createdAt', '>', Timestamp.fromDate(EXPORT_COMPLETED_AT))
      .get();

    for (const postDoc of postsSnapshot.docs) {
      records.push({
        id: postDoc.id,
        data: mapPostToSupabase(boardDoc.id, postDoc.id, postDoc.data()),
      });
    }
  }

  return records;
}

async function findRecentComments(): Promise<GapRecord[]> {
  const records: GapRecord[] = [];
  const boardsSnapshot = await firestore.collection('boards').get();

  for (const boardDoc of boardsSnapshot.docs) {
    const postsSnapshot = await firestore.collection(`boards/${boardDoc.id}/posts`).get();

    for (const postDoc of postsSnapshot.docs) {
      const commentsSnapshot = await firestore
        .collection(`boards/${boardDoc.id}/posts/${postDoc.id}/comments`)
        .where('createdAt', '>', Timestamp.fromDate(EXPORT_COMPLETED_AT))
        .get();

      for (const commentDoc of commentsSnapshot.docs) {
        records.push({
          id: commentDoc.id,
          data: mapCommentToSupabase(postDoc.id, commentDoc.id, commentDoc.data()),
        });
      }
    }
  }

  return records;
}

async function findRecentReplies(): Promise<GapRecord[]> {
  const records: GapRecord[] = [];
  const boardsSnapshot = await firestore.collection('boards').get();

  for (const boardDoc of boardsSnapshot.docs) {
    const postsSnapshot = await firestore.collection(`boards/${boardDoc.id}/posts`).get();

    for (const postDoc of postsSnapshot.docs) {
      const commentsSnapshot = await firestore
        .collection(`boards/${boardDoc.id}/posts/${postDoc.id}/comments`)
        .get();

      for (const commentDoc of commentsSnapshot.docs) {
        const repliesSnapshot = await firestore
          .collection(
            `boards/${boardDoc.id}/posts/${postDoc.id}/comments/${commentDoc.id}/replies`
          )
          .where('createdAt', '>', Timestamp.fromDate(EXPORT_COMPLETED_AT))
          .get();

        for (const replyDoc of repliesSnapshot.docs) {
          records.push({
            id: replyDoc.id,
            data: mapReplyToSupabase(commentDoc.id, replyDoc.id, replyDoc.data()),
          });
        }
      }
    }
  }

  return records;
}

async function findRecentLikes(): Promise<GapRecord[]> {
  const records: GapRecord[] = [];
  const boardsSnapshot = await firestore.collection('boards').get();

  for (const boardDoc of boardsSnapshot.docs) {
    const postsSnapshot = await firestore.collection(`boards/${boardDoc.id}/posts`).get();

    for (const postDoc of postsSnapshot.docs) {
      const likesSnapshot = await firestore
        .collection(`boards/${boardDoc.id}/posts/${postDoc.id}/likes`)
        .where('createdAt', '>', Timestamp.fromDate(EXPORT_COMPLETED_AT))
        .get();

      for (const likeDoc of likesSnapshot.docs) {
        records.push({
          id: likeDoc.id,
          data: mapLikeToSupabase(postDoc.id, likeDoc.id, likeDoc.data()),
        });
      }
    }
  }

  return records;
}

async function findRecentReactions(): Promise<GapRecord[]> {
  const records: GapRecord[] = [];
  const boardsSnapshot = await firestore.collection('boards').get();

  for (const boardDoc of boardsSnapshot.docs) {
    const postsSnapshot = await firestore.collection(`boards/${boardDoc.id}/posts`).get();

    for (const postDoc of postsSnapshot.docs) {
      const commentsSnapshot = await firestore
        .collection(`boards/${boardDoc.id}/posts/${postDoc.id}/comments`)
        .get();

      for (const commentDoc of commentsSnapshot.docs) {
        // Reactions on comments
        const commentReactionsSnapshot = await firestore
          .collection(
            `boards/${boardDoc.id}/posts/${postDoc.id}/comments/${commentDoc.id}/reactions`
          )
          .where('createdAt', '>', Timestamp.fromDate(EXPORT_COMPLETED_AT))
          .get();

        for (const reactionDoc of commentReactionsSnapshot.docs) {
          const data = reactionDoc.data();
          if (!data.reactionUser?.userId) continue;

          records.push({
            id: reactionDoc.id,
            data: mapReactionToSupabase(reactionDoc.id, data, commentDoc.id, null),
          });
        }

        // Reactions on replies
        const repliesSnapshot = await firestore
          .collection(
            `boards/${boardDoc.id}/posts/${postDoc.id}/comments/${commentDoc.id}/replies`
          )
          .get();

        for (const replyDoc of repliesSnapshot.docs) {
          const replyReactionsSnapshot = await firestore
            .collection(
              `boards/${boardDoc.id}/posts/${postDoc.id}/comments/${commentDoc.id}/replies/${replyDoc.id}/reactions`
            )
            .where('createdAt', '>', Timestamp.fromDate(EXPORT_COMPLETED_AT))
            .get();

          for (const reactionDoc of replyReactionsSnapshot.docs) {
            const data = reactionDoc.data();
            if (!data.reactionUser?.userId) continue;

            records.push({
              id: reactionDoc.id,
              data: mapReactionToSupabase(reactionDoc.id, data, null, replyDoc.id),
            });
          }
        }
      }
    }
  }

  return records;
}

async function findRecentBlocks(): Promise<GapRecord[]> {
  const records: GapRecord[] = [];
  const usersSnapshot = await firestore.collection('users').get();

  for (const userDoc of usersSnapshot.docs) {
    const blocksSnapshot = await firestore
      .collection(`users/${userDoc.id}/blockedUsers`)
      .where('blockedAt', '>', Timestamp.fromDate(EXPORT_COMPLETED_AT))
      .get();

    for (const blockDoc of blocksSnapshot.docs) {
      records.push({
        id: `${userDoc.id}_${blockDoc.id}`,
        data: {
          blocker_id: userDoc.id,
          blocked_id: blockDoc.id,
          created_at: convertTimestamp(blockDoc.data().blockedAt),
        },
      });
    }
  }

  return records;
}

// --- Mapping Functions ---

function convertTimestamp(ts: Timestamp | undefined): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

function mapUserToSupabase(
  id: string,
  data: FirebaseFirestore.DocumentData
): Record<string, unknown> {
  return {
    id,
    real_name: data.realName || null,
    nickname: data.nickname || null,
    email: data.email || null,
    profile_photo_url: data.profilePhotoURL || null,
    bio: data.bio || null,
    phone_number: data.phoneNumber || null,
    referrer: data.referrer || null,
    created_at: convertTimestamp(data.createdAt) || new Date().toISOString(),
    updated_at: convertTimestamp(data.updatedAt) || convertTimestamp(data.createdAt) || new Date().toISOString(),
  };
}

function mapPostToSupabase(
  boardId: string,
  postId: string,
  data: FirebaseFirestore.DocumentData
): Record<string, unknown> {
  return {
    id: postId,
    board_id: boardId,
    author_id: data.authorId,
    author_name: data.authorName || '',
    title: data.title || '',
    content: data.content || '',
    content_json: data.contentJson || null,
    thumbnail_image_url: data.thumbnailImageURL || null,
    visibility: data.visibility || 'public',
    count_of_comments: data.countOfComments || 0,
    count_of_replies: data.countOfReplies || 0,
    count_of_likes: data.countOfLikes || 0,
    engagement_score: data.engagementScore || 0,
    week_days_from_first_day: data.weekDaysFromFirstDay ?? null,
    created_at: convertTimestamp(data.createdAt) || new Date().toISOString(),
    updated_at: convertTimestamp(data.updatedAt) || convertTimestamp(data.createdAt) || new Date().toISOString(),
  };
}

function mapCommentToSupabase(
  postId: string,
  commentId: string,
  data: FirebaseFirestore.DocumentData
): Record<string, unknown> {
  return {
    id: commentId,
    post_id: postId,
    user_id: data.userId,
    user_name: data.userName || '',
    user_profile_image: data.userProfileImage || null,
    content: data.content || '',
    count_of_replies: data.countOfReplies || 0,
    created_at: convertTimestamp(data.createdAt) || new Date().toISOString(),
    updated_at: convertTimestamp(data.updatedAt) || convertTimestamp(data.createdAt) || new Date().toISOString(),
  };
}

function mapReplyToSupabase(
  commentId: string,
  replyId: string,
  data: FirebaseFirestore.DocumentData
): Record<string, unknown> {
  return {
    id: replyId,
    comment_id: commentId,
    user_id: data.userId,
    user_name: data.userName || '',
    user_profile_image: data.userProfileImage || null,
    content: data.content || '',
    created_at: convertTimestamp(data.createdAt) || new Date().toISOString(),
    updated_at: convertTimestamp(data.updatedAt) || convertTimestamp(data.createdAt) || new Date().toISOString(),
  };
}

function mapLikeToSupabase(
  postId: string,
  likeId: string,
  data: FirebaseFirestore.DocumentData
): Record<string, unknown> {
  return {
    id: likeId,
    post_id: postId,
    user_id: data.userId,
    user_name: data.userName || '',
    user_profile_image: data.userProfileImage || null,
    created_at: convertTimestamp(data.createdAt) || new Date().toISOString(),
  };
}

function mapReactionToSupabase(
  reactionId: string,
  data: FirebaseFirestore.DocumentData,
  commentId: string | null,
  replyId: string | null
): Record<string, unknown> {
  const reactionUser = (data.reactionUser || {}) as {
    userId?: string;
    userName?: string;
    userProfileImage?: string | null;
  };

  return {
    id: reactionId,
    comment_id: commentId,
    reply_id: replyId,
    user_id: reactionUser.userId ?? data.userId,
    user_name: reactionUser.userName ?? data.userName ?? '',
    user_profile_image: reactionUser.userProfileImage ?? data.userProfileImage ?? null,
    reaction_type: data.reactionType || data.content || null,
    created_at: convertTimestamp(data.createdAt) || new Date().toISOString(),
  };
}

// --- Sync Functions ---

async function findMissingInSupabase(
  tableName: string,
  records: GapRecord[]
): Promise<GapRecord[]> {
  if (records.length === 0) return [];

  const existingIds = new Set<string>();

  // Batch the lookup to avoid hitting Supabase query limits
  const ids = records.map((r) => r.id);
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batchIds = ids.slice(i, i + BATCH_SIZE);
    const { data: existingRecords, error } = await supabase
      .from(tableName)
      .select('id')
      .in('id', batchIds);

    if (error) {
      console.error(`  Error checking existing records in ${tableName}: ${error.message}`);
      throw new Error(`Failed to check existing records: ${error.message}`);
    }

    for (const record of existingRecords || []) {
      existingIds.add(record.id);
    }
  }

  return records.filter((r) => !existingIds.has(r.id));
}

async function insertMissingRecords(
  tableName: string,
  records: GapRecord[],
  isDryRun: boolean
): Promise<{ inserted: number; errors: number }> {
  if (records.length === 0) return { inserted: 0, errors: 0 };
  if (isDryRun) return { inserted: records.length, errors: 0 };

  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const dataToInsert = batch.map((r) => r.data);

    const { error } = await supabase
      .from(tableName)
      .upsert(dataToInsert, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      console.error(`  Error in batch: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}

async function syncCollection(
  collectionName: string,
  tableName: string,
  findRecords: () => Promise<GapRecord[]>,
  isDryRun: boolean
): Promise<GapSummary> {
  console.log(`\n--- ${collectionName} ---`);

  console.log('  Finding recent records in Firestore...');
  const recentRecords = await findRecords();
  console.log(`  Found ${recentRecords.length} records after export timestamp`);

  if (recentRecords.length === 0) {
    return {
      collection: collectionName,
      firestoreCount: 0,
      missingInSupabase: 0,
      inserted: 0,
      errors: 0,
    };
  }

  console.log('  Checking which are missing in Supabase...');
  const missingRecords = await findMissingInSupabase(tableName, recentRecords);
  console.log(`  Missing in Supabase: ${missingRecords.length}`);

  if (missingRecords.length === 0) {
    return {
      collection: collectionName,
      firestoreCount: recentRecords.length,
      missingInSupabase: 0,
      inserted: 0,
      errors: 0,
    };
  }

  const prefix = isDryRun ? '  [DRY-RUN] Would insert' : '  Inserting';
  console.log(`${prefix} ${missingRecords.length} records...`);

  const { inserted, errors } = await insertMissingRecords(tableName, missingRecords, isDryRun);

  return {
    collection: collectionName,
    firestoreCount: recentRecords.length,
    missingInSupabase: missingRecords.length,
    inserted,
    errors,
  };
}

// --- Main ---

async function main(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('=== Backfill Gap Migration ===');
  console.log(`Export completed at: ${EXPORT_COMPLETED_AT.toISOString()}`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (no changes)' : 'LIVE'}`);

  const summaries: GapSummary[] = [];

  // Sync each collection
  summaries.push(await syncCollection('users', 'users', findRecentUsers, isDryRun));
  summaries.push(await syncCollection('posts', 'posts', findRecentPosts, isDryRun));
  summaries.push(await syncCollection('comments', 'comments', findRecentComments, isDryRun));
  summaries.push(await syncCollection('replies', 'replies', findRecentReplies, isDryRun));
  summaries.push(await syncCollection('likes', 'likes', findRecentLikes, isDryRun));
  summaries.push(await syncCollection('reactions', 'reactions', findRecentReactions, isDryRun));
  summaries.push(await syncCollection('blocks', 'blocks', findRecentBlocks, isDryRun));

  // Print summary
  console.log('\n=== Summary ===');
  console.log('Collection     | Firestore | Missing | Inserted | Errors');
  console.log('---------------|-----------|---------|----------|-------');

  let totalMissing = 0;
  let totalInserted = 0;
  let totalErrors = 0;

  for (const s of summaries) {
    const name = s.collection.padEnd(15);
    const firestore = String(s.firestoreCount).padEnd(10);
    const missing = String(s.missingInSupabase).padEnd(8);
    const inserted = String(s.inserted).padEnd(9);
    const errors = String(s.errors);

    console.log(`${name}| ${firestore}| ${missing}| ${inserted}| ${errors}`);

    totalMissing += s.missingInSupabase;
    totalInserted += s.inserted;
    totalErrors += s.errors;
  }

  console.log('---------------|-----------|---------|----------|-------');
  console.log(
    `${'TOTAL'.padEnd(15)}| ${'-'.padEnd(10)}| ${String(totalMissing).padEnd(8)}| ${String(totalInserted).padEnd(9)}| ${totalErrors}`
  );

  if (isDryRun && totalMissing > 0) {
    console.log('\n[DRY-RUN] Run without --dry-run to insert missing records.');
  }

  if (totalErrors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
