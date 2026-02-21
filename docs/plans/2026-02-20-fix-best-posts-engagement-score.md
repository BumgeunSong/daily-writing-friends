# Fix BestPostCardList: Engagement Score Dual-Write & Backfill

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix BestPostCardList showing same posts as RecentPostCardList when `VITE_READ_SOURCE=supabase`, by syncing `engagement_score` from Firestore to Supabase.

**Architecture:** The `updateEngagementScore` Cloud Function recalculates scores on Firestore post changes but never writes to Supabase. We add a Supabase update to the Cloud Function, then backfill all existing scores from Firestore to Supabase.

**Tech Stack:** Firebase Cloud Functions v2, Supabase JS client, TypeScript, `npx tsx` for scripts

---

## Root Cause

`updateEngagementScore` (Cloud Function) triggers on `boards/{boardId}/posts/{postId}` writes. It calculates `comments + replies + likes` and writes `engagementScore` back to Firestore only. The Supabase `posts.engagement_score` column stays at `DEFAULT 0` for all posts. When Supabase reads sort by `engagement_score DESC`, all values are 0 — producing arbitrary order identical to recent posts.

---

### Task 1: Add Supabase dual-write to `updateEngagementScore` Cloud Function

**Files:**
- Modify: `functions/src/engagementScore/updateEngagementScore.ts`

**Step 1: Write the implementation**

Add Supabase update after the Firestore update, using the existing `dualWriteServer` pattern from `functions/src/shared/supabaseAdmin.ts`.

```typescript
// functions/src/engagementScore/updateEngagementScore.ts
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import admin from '../shared/admin';
import { calculateEngagementScore, shouldUpdateEngagementScore } from './calculateEngagementScore';
import { dualWriteServer, getSupabaseAdmin, throwOnError } from '../shared/supabaseAdmin';

interface PostData {
  countOfComments?: number;
  countOfReplies?: number;
  countOfLikes?: number;
  engagementScore?: number;
}

export const updateEngagementScore = onDocumentWritten(
  'boards/{boardId}/posts/{postId}',
  async (event) => {
    const afterData = event.data?.after.data() as PostData | undefined;

    if (!afterData) {
      return;
    }

    const { countOfComments, countOfReplies, countOfLikes, engagementScore: previousScore } = afterData;

    const newScore = calculateEngagementScore(countOfComments, countOfReplies, countOfLikes);

    if (!shouldUpdateEngagementScore(previousScore, newScore)) {
      return;
    }

    const { boardId, postId } = event.params;
    const postRef = admin.firestore().doc(`boards/${boardId}/posts/${postId}`);

    try {
      await postRef.update({ engagementScore: newScore });
      console.info(`Updated engagementScore for post ${boardId}/${postId}: ${newScore}`);
    } catch (error) {
      console.error(`Error updating engagementScore for post ${boardId}/${postId}:`, error);
    }

    // Dual-write engagement_score to Supabase
    await dualWriteServer(
      'post',
      'update',
      postId,
      async () => {
        const supabase = getSupabaseAdmin();
        throwOnError(
          await supabase
            .from('posts')
            .update({ engagement_score: newScore })
            .eq('id', postId)
        );
      }
    );
  }
);
```

**Step 2: Build to verify no type errors**

Run: `cd functions && npm run build`
Expected: Compiles with no errors

**Step 3: Commit**

```bash
git add functions/src/engagementScore/updateEngagementScore.ts
git commit -m "fix: add Supabase dual-write to updateEngagementScore

engagement_score was never synced to Supabase, causing BestPostCardList
to show arbitrary order (all scores stuck at default 0)."
```

---

### Task 2: Create backfill script to sync existing engagement scores

**Files:**
- Create: `scripts/migration/backfill-engagement-scores.ts`

**Step 1: Write the backfill script**

Pattern follows existing `scripts/migration/backfill-board-permissions.ts`. Reads all posts from Firestore, batch-updates Supabase `engagement_score`.

```typescript
// scripts/migration/backfill-engagement-scores.ts
/**
 * Backfill engagement_score from Firestore to Supabase.
 *
 * Usage:
 *   npx tsx scripts/migration/backfill-engagement-scores.ts [--dry-run]
 *
 * Prerequisites:
 *   - gcloud auth application-default login
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// --- Firebase Admin ---
if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}')) });
}
// Fallback: if no JSON cred, use application-default credentials
if (getApps().length === 0) {
  initializeApp();
}
const firestore = getFirestore();

// --- Supabase ---
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`=== Backfill engagement_score (${dryRun ? 'DRY RUN' : 'LIVE'}) ===\n`);

  // 1. Get all boards
  const boardsSnap = await firestore.collection('boards').get();
  const boardIds = boardsSnap.docs.map(d => d.id);
  console.log(`Found ${boardIds.length} boards\n`);

  let totalPosts = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const boardId of boardIds) {
    const postsSnap = await firestore.collection(`boards/${boardId}/posts`).get();
    console.log(`Board ${boardId}: ${postsSnap.size} posts`);

    for (const doc of postsSnap.docs) {
      totalPosts++;
      const data = doc.data();
      const firestoreScore = data.engagementScore ?? 0;

      if (firestoreScore === 0) {
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(`  [DRY] ${doc.id}: engagement_score = ${firestoreScore}`);
        updated++;
        continue;
      }

      const { error } = await supabase
        .from('posts')
        .update({ engagement_score: firestoreScore })
        .eq('id', doc.id);

      if (error) {
        console.error(`  ERROR ${doc.id}: ${error.message}`);
        errors++;
      } else {
        updated++;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total posts:  ${totalPosts}`);
  console.log(`Updated:      ${updated}`);
  console.log(`Skipped (0):  ${skipped}`);
  console.log(`Errors:       ${errors}`);
}

main().catch(console.error);
```

**Step 2: Run dry-run to verify**

Run: `npx tsx scripts/migration/backfill-engagement-scores.ts --dry-run`
Expected: Lists posts with non-zero scores, no actual updates

**Step 3: Run live backfill**

Run: `npx tsx scripts/migration/backfill-engagement-scores.ts`
Expected: All non-zero scores synced, 0 errors

**Step 4: Verify in Supabase**

Run this SQL in Supabase dashboard to confirm scores are populated:
```sql
SELECT engagement_score, COUNT(*)
FROM posts
GROUP BY engagement_score
ORDER BY engagement_score DESC
LIMIT 20;
```
Expected: Distribution of non-zero scores (not all 0)

**Step 5: Commit**

```bash
git add scripts/migration/backfill-engagement-scores.ts
git commit -m "feat: add backfill script for engagement_score to Supabase"
```

---

### Task 3: Deploy Cloud Function and verify end-to-end

**Step 1: Deploy the updated Cloud Function**

Run: `cd functions && npx firebase deploy --only functions:updateEngagementScore`
Expected: Deploy succeeds

**Step 2: Verify BestPostCardList works**

1. Set `VITE_READ_SOURCE=supabase`
2. Open board page, switch to "Best" tab
3. Posts should now be sorted by engagement (not same as Recent)

**Step 3: Commit updated migration progress**

Update `docs/plan_and_review/migration_progress.md` with the fix details.

---

## Execution Order

```
Task 1 (Cloud Function fix) → Task 2 (Backfill) → Task 3 (Deploy & verify)
```

All tasks are sequential — backfill depends on understanding the fix, deploy depends on both being ready.

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `dualWriteServer` skipped (DUAL_WRITE_ENABLED=false) | Low | Already enabled since Feb 8 |
| Backfill updates post not in Supabase | Low | `.update().eq('id', ...)` silently updates 0 rows |
| Cloud Function infinite loop (write triggers itself) | None | `shouldUpdateEngagementScore` prevents re-trigger when score unchanged |
