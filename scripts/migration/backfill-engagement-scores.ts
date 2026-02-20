/**
 * Backfill: Sync all Firestore post engagementScore → Supabase posts.engagement_score
 *
 * Safe to run multiple times (uses update on existing posts).
 * Usage: npx tsx scripts/migration/backfill-engagement-scores.ts [--dry-run]
 */
import { firestore, supabase, BATCH_SIZE } from './config.js';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('=== Backfill: post engagementScore → posts.engagement_score ===\n');
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No database changes will be made\n');
  }

  // 1. Read all Firestore boards
  const boardsSnap = await firestore.collection('boards').get();
  console.log(`Firestore boards: ${boardsSnap.size}`);

  // 2. Build update rows from all posts across all boards
  const updateRows: { id: string; engagement_score: number }[] = [];
  let totalPostsProcessed = 0;
  let postsWithEngagement = 0;

  for (const boardDoc of boardsSnap.docs) {
    const boardId = boardDoc.id;
    const postsSnap = await firestore
      .collection('boards')
      .doc(boardId)
      .collection('posts')
      .get();

    totalPostsProcessed += postsSnap.size;

    for (const postDoc of postsSnap.docs) {
      const postData = postDoc.data();
      const engagementScore = postData.engagementScore;

      // Skip posts with no engagement score or zero engagement
      if (typeof engagementScore === 'number' && engagementScore > 0) {
        updateRows.push({
          id: postDoc.id,
          engagement_score: engagementScore,
        });
        postsWithEngagement += 1;
      }
    }
  }

  console.log(`Total posts processed: ${totalPostsProcessed}`);
  console.log(`Posts with engagement > 0: ${postsWithEngagement}`);
  console.log(`Total rows to update: ${updateRows.length}`);

  if (dryRun) {
    console.log('\n--- Dry Run Summary ---');
    console.log(`Would update ${updateRows.length} posts`);
    if (updateRows.length > 0) {
      console.log('\nSample rows (first 5):');
      updateRows.slice(0, 5).forEach((row) => {
        console.log(`  Post ${row.id}: engagement_score=${row.engagement_score}`);
      });
    }
    return;
  }

  // 3. Update in batches
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < updateRows.length; i += BATCH_SIZE) {
    const batch = updateRows.slice(i, i + BATCH_SIZE);

    // Process each row individually since Supabase doesn't support batch updates
    for (const row of batch) {
      const { error } = await supabase
        .from('posts')
        .update({ engagement_score: row.engagement_score })
        .eq('id', row.id);

      if (error) {
        console.error(`Error updating post ${row.id}:`, error.message);
        errors += 1;
      } else {
        updated += 1;
      }
    }

    // Progress indicator for large datasets
    if (i > 0 && i % (BATCH_SIZE * 10) === 0) {
      console.log(`Progress: ${i}/${updateRows.length} posts processed`);
    }
  }

  console.log(`\n--- Results ---`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);

  // 4. Verify
  const { count } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .gt('engagement_score', 0);
  console.log(`\nSupabase posts with engagement_score > 0: ${count}`);
}

main().catch(console.error).finally(() => process.exit(0));
