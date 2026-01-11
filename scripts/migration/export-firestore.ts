/**
 * Export Firestore Data
 *
 * Exports all Firestore collections to JSON files for migration to Supabase.
 *
 * Usage:
 *   npx ts-node scripts/migration/export-firestore.ts
 *
 * Output:
 *   data/migration-export/
 *   ├── boards.json
 *   ├── board_waiting_users.json  (normalized from boards.waitingUsersIds)
 *   ├── users.json
 *   ├── posts.json
 *   ├── comments.json
 *   ├── replies.json
 *   ├── likes.json
 *   ├── reactions.json
 *   ├── blocks.json
 *   └── notifications.json
 */

import { firestore, BATCH_SIZE, EXPORT_DIR } from './config';
import { Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// Convert Firestore Timestamp to ISO string
function convertTimestamp(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value && typeof value === 'object' && '_seconds' in value) {
    // Handle serialized Timestamp format
    const ts = value as { _seconds: number; _nanoseconds: number };
    return new Date(ts._seconds * 1000 + ts._nanoseconds / 1000000).toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(convertTimestamp);
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = convertTimestamp(v);
    }
    return result;
  }
  return value;
}

// Export a collection to JSON file
async function exportCollection(
  collectionPath: string,
  outputFile: string,
  transform?: (doc: FirebaseFirestore.DocumentSnapshot) => Record<string, unknown> | null
): Promise<number> {
  console.log(`Exporting ${collectionPath}...`);

  const collection = firestore.collection(collectionPath);
  const docs: Record<string, unknown>[] = [];

  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;
  let batch = 0;

  while (true) {
    let query = collection.orderBy('__name__').limit(BATCH_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const data = transform ? transform(doc) : { id: doc.id, ...convertTimestamp(doc.data()) };
      if (data) {
        docs.push(data);
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    batch++;
    console.log(`  Batch ${batch}: ${docs.length} documents so far...`);
  }

  const outputPath = path.join(EXPORT_DIR, outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(docs, null, 2));
  console.log(`  Exported ${docs.length} documents to ${outputFile}`);

  return docs.length;
}

// Export nested subcollections (posts, comments, replies, likes, reactions)
async function exportNestedCollections(): Promise<void> {
  console.log('\nExporting nested collections from boards...');

  const posts: Record<string, unknown>[] = [];
  const comments: Record<string, unknown>[] = [];
  const replies: Record<string, unknown>[] = [];
  const likes: Record<string, unknown>[] = [];
  const reactions: Record<string, unknown>[] = [];

  // Get all boards
  const boardsSnapshot = await firestore.collection('boards').get();
  console.log(`Found ${boardsSnapshot.size} boards`);

  for (const boardDoc of boardsSnapshot.docs) {
    const boardId = boardDoc.id;
    console.log(`\nProcessing board: ${boardId}`);

    // Export posts for this board
    const postsSnapshot = await firestore
      .collection(`boards/${boardId}/posts`)
      .get();

    for (const postDoc of postsSnapshot.docs) {
      const postData = postDoc.data();
      posts.push({
        id: postDoc.id,
        board_id: boardId,
        author_id: postData.authorId,
        author_name: postData.authorName,
        title: postData.title,
        content: postData.content || '',
        content_json: postData.contentJson || null,
        thumbnail_image_url: postData.thumbnailImageURL || null,
        visibility: postData.visibility || 'public',
        count_of_comments: postData.countOfComments || 0,
        count_of_replies: postData.countOfReplies || 0,
        count_of_likes: postData.countOfLikes || 0,
        engagement_score: postData.engagementScore || 0,
        week_days_from_first_day: postData.weekDaysFromFirstDay ?? null,
        created_at: convertTimestamp(postData.createdAt),
        updated_at: convertTimestamp(postData.updatedAt) || convertTimestamp(postData.createdAt),
      });

      // Export comments for this post
      const commentsSnapshot = await firestore
        .collection(`boards/${boardId}/posts/${postDoc.id}/comments`)
        .get();

      for (const commentDoc of commentsSnapshot.docs) {
        const commentData = commentDoc.data();
        comments.push({
          id: commentDoc.id,
          post_id: postDoc.id,
          user_id: commentData.userId,
          user_name: commentData.userName || '',  // Historical identity
          user_profile_image: commentData.userProfileImage || null,
          content: commentData.content,
          count_of_replies: 0, // Will be calculated during import
          created_at: convertTimestamp(commentData.createdAt),
          updated_at: convertTimestamp(commentData.createdAt),
        });

        // Export replies for this comment
        const repliesSnapshot = await firestore
          .collection(`boards/${boardId}/posts/${postDoc.id}/comments/${commentDoc.id}/replies`)
          .get();

        for (const replyDoc of repliesSnapshot.docs) {
          const replyData = replyDoc.data();
          replies.push({
            id: replyDoc.id,
            comment_id: commentDoc.id,
            post_id: postDoc.id,
            user_id: replyData.userId,
            user_name: replyData.userName || '',  // Historical identity
            user_profile_image: replyData.userProfileImage || null,
            content: replyData.content,
            created_at: convertTimestamp(replyData.createdAt),
            updated_at: convertTimestamp(replyData.createdAt),
          });

          // Export reactions on this reply
          const replyReactionsSnapshot = await firestore
            .collection(`boards/${boardId}/posts/${postDoc.id}/comments/${commentDoc.id}/replies/${replyDoc.id}/reactions`)
            .get();

          for (const reactionDoc of replyReactionsSnapshot.docs) {
            const reactionData = reactionDoc.data();
            const userId = reactionData.reactionUser?.userId;
            if (!userId) {
              console.warn(`  Skipping reaction ${reactionDoc.id} on reply ${replyDoc.id}: missing user_id`);
              continue;
            }
            reactions.push({
              id: reactionDoc.id,
              comment_id: null,
              reply_id: replyDoc.id,
              user_id: userId,
              user_name: reactionData.reactionUser?.userName || null,  // Historical identity
              user_profile_image: reactionData.reactionUser?.userProfileImage || null,
              reaction_type: reactionData.content,
              created_at: convertTimestamp(reactionData.createdAt),
            });
          }
        }

        // Export reactions on this comment
        const commentReactionsSnapshot = await firestore
          .collection(`boards/${boardId}/posts/${postDoc.id}/comments/${commentDoc.id}/reactions`)
          .get();

        for (const reactionDoc of commentReactionsSnapshot.docs) {
          const reactionData = reactionDoc.data();
          const userId = reactionData.reactionUser?.userId;
          if (!userId) {
            console.warn(`  Skipping reaction ${reactionDoc.id} on comment ${commentDoc.id}: missing user_id`);
            continue;
          }
          reactions.push({
            id: reactionDoc.id,
            comment_id: commentDoc.id,
            reply_id: null,
            user_id: userId,
            user_name: reactionData.reactionUser?.userName || null,  // Historical identity
            user_profile_image: reactionData.reactionUser?.userProfileImage || null,
            reaction_type: reactionData.content,
            created_at: convertTimestamp(reactionData.createdAt),
          });
        }
      }

      // Export likes for this post
      const likesSnapshot = await firestore
        .collection(`boards/${boardId}/posts/${postDoc.id}/likes`)
        .get();

      for (const likeDoc of likesSnapshot.docs) {
        const likeData = likeDoc.data();
        likes.push({
          id: likeDoc.id,
          post_id: postDoc.id,
          user_id: likeData.userId,
          user_name: likeData.userName || null,  // Historical identity
          user_profile_image: likeData.userProfileImage || null,
          created_at: convertTimestamp(likeData.createdAt),
        });
      }
    }

    console.log(`  Posts: ${posts.length}, Comments: ${comments.length}, Replies: ${replies.length}, Likes: ${likes.length}, Reactions: ${reactions.length}`);
  }

  // Write all nested collections to files
  fs.writeFileSync(path.join(EXPORT_DIR, 'posts.json'), JSON.stringify(posts, null, 2));
  console.log(`\nExported ${posts.length} posts`);

  fs.writeFileSync(path.join(EXPORT_DIR, 'comments.json'), JSON.stringify(comments, null, 2));
  console.log(`Exported ${comments.length} comments`);

  fs.writeFileSync(path.join(EXPORT_DIR, 'replies.json'), JSON.stringify(replies, null, 2));
  console.log(`Exported ${replies.length} replies`);

  fs.writeFileSync(path.join(EXPORT_DIR, 'likes.json'), JSON.stringify(likes, null, 2));
  console.log(`Exported ${likes.length} likes`);

  fs.writeFileSync(path.join(EXPORT_DIR, 'reactions.json'), JSON.stringify(reactions, null, 2));
  console.log(`Exported ${reactions.length} reactions`);
}

// Export user notifications
async function exportNotifications(): Promise<void> {
  console.log('\nExporting notifications from users...');

  const notifications: Record<string, unknown>[] = [];

  const usersSnapshot = await firestore.collection('users').get();

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;

    const notificationsSnapshot = await firestore
      .collection(`users/${userId}/notifications`)
      .get();

    for (const notifDoc of notificationsSnapshot.docs) {
      const notifData = notifDoc.data();
      notifications.push({
        id: notifDoc.id,
        recipient_id: userId,
        type: notifData.type,
        actor_id: notifData.fromUserId,
        board_id: notifData.boardId,
        post_id: notifData.postId,
        comment_id: notifData.commentId || '',
        reply_id: notifData.replyId || '',
        reaction_id: notifData.reactionId || null,
        like_id: notifData.likeId || null,
        message: notifData.message,
        read: notifData.read || false,
        created_at: convertTimestamp(notifData.timestamp),
      });
    }
  }

  fs.writeFileSync(path.join(EXPORT_DIR, 'notifications.json'), JSON.stringify(notifications, null, 2));
  console.log(`Exported ${notifications.length} notifications`);
}

// Export user blocks
async function exportBlocks(): Promise<void> {
  console.log('\nExporting blocks from users...');

  const blocks: Record<string, unknown>[] = [];

  const usersSnapshot = await firestore.collection('users').get();

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;

    const blockedUsersSnapshot = await firestore
      .collection(`users/${userId}/blockedUsers`)
      .get();

    for (const blockedDoc of blockedUsersSnapshot.docs) {
      blocks.push({
        blocker_id: userId,
        blocked_id: blockedDoc.id,
        created_at: new Date().toISOString(), // Firestore doesn't store timestamp for blocks
      });
    }
  }

  fs.writeFileSync(path.join(EXPORT_DIR, 'blocks.json'), JSON.stringify(blocks, null, 2));
  console.log(`Exported ${blocks.length} blocks`);
}

// Main export function
async function main(): Promise<void> {
  console.log('=== Firestore Export Started ===\n');
  console.log(`Export directory: ${EXPORT_DIR}\n`);

  // Export top-level collections
  // Store waiting users for separate export
  const boardWaitingUsers: { board_id: string; user_id: string }[] = [];

  await exportCollection('boards', 'boards.json', (doc) => {
    const data = doc.data();
    if (!data) return null;

    // Collect waiting users for normalized table
    const waitingUsersIds = data.waitingUsersIds || [];
    for (const userId of waitingUsersIds) {
      boardWaitingUsers.push({ board_id: doc.id, user_id: userId });
    }

    return {
      id: doc.id,
      title: data.title,
      description: data.description || null,
      first_day: convertTimestamp(data.firstDay) || null,
      last_day: convertTimestamp(data.lastDay) || null,
      cohort: data.cohort ?? null,
      created_at: convertTimestamp(data.createdAt) || new Date().toISOString(),
      updated_at: convertTimestamp(data.createdAt) || new Date().toISOString(),
    };
  });

  // Export board waiting users to separate file
  if (boardWaitingUsers.length > 0) {
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'board_waiting_users.json'),
      JSON.stringify(boardWaitingUsers, null, 2)
    );
    console.log(`Exported ${boardWaitingUsers.length} board waiting users`);
  }

  await exportCollection('users', 'users.json', (doc) => {
    const data = doc.data();
    if (!data) return null;
    return {
      id: doc.id,
      real_name: data.realName || null,
      nickname: data.nickname || null,
      email: data.email || null,
      profile_photo_url: data.profilePhotoURL || null,
      bio: data.bio || null,
      phone_number: data.phoneNumber || null,
      referrer: data.referrer || null,
      recovery_status: data.recoveryStatus || null,
      timezone: data.profile?.timezone || null,
      known_buddy_uid: data.knownBuddy?.uid || null,  // FK only, no denormalized data
      created_at: convertTimestamp(data.createdAt) || new Date().toISOString(),
      updated_at: convertTimestamp(data.updatedAt) || new Date().toISOString(),
      // Store board permissions for separate import
      _board_permissions: data.boardPermissions || {},
    };
  });

  // Export nested collections
  await exportNestedCollections();

  // Export user-related subcollections
  await exportNotifications();
  await exportBlocks();

  console.log('\n=== Firestore Export Completed ===');
  console.log(`Files saved to: ${EXPORT_DIR}`);
}

main().catch((error) => {
  console.error('Export failed:', error);
  process.exit(1);
});
