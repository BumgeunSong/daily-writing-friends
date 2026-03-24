# Fix Comment Count & Deduplicate Legacy src/ Implementation Plan (v2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix wrong comment+reply count in PostCardFooter by switching to live embedded counts, then delete the dead `src/` mirror to prevent future drift.

**Architecture:** The bug is in `apps/web/src/shared/api/supabaseReads.ts` — it reads only the stale cached counter columns (`count_of_comments`, `count_of_replies`) instead of live PostgREST embedded counts (`comments(count)`, `replies(count)`). The `src/` directory is a legacy mirror — all root scripts delegate to `--filter web`. Deleting it establishes a single source of truth. Split into two PRs for independent revertability.

**Tech Stack:** Supabase PostgREST, TypeScript, Vitest, pnpm monorepo

**Affected callers of FEED_POST_SELECT / mapRowToPost:**
- `apps/web/src/shared/api/supabaseReads.ts` — `fetchRecentPostsFromSupabase`, `fetchBestPostsFromSupabase`
- `apps/web/src/user/hooks/useUserPosts.ts:54` — auto-covered (composes `FEED_POST_SELECT`)
- `apps/web/src/post/utils/postUtils.ts:13` — `fetchPost` uses `select('*')`, needs explicit embed joins

**Out of scope (follow-up tickets):**
- Investigate why DB counter triggers (migration 20260222) aren't populating `count_of_comments`
- Fix admin app (`apps/admin`) which also reads stale cached columns

---

## PR 1: Fix comment/reply count bug

### Task 1: Add live embedded counts to feed queries and mapper

**Files:**
- Modify: `apps/web/src/shared/api/supabaseReads.ts:69-95` (type + select constant)
- Modify: `apps/web/src/shared/api/supabaseReads.ts:571-574` (mapRowToPost)
- Test: `apps/web/src/shared/api/supabaseReads.test.ts`

#### Step 1: Write a failing test

Add to the `denormalized counts` describe block in `apps/web/src/shared/api/supabaseReads.test.ts`:

```typescript
it('prefers live embedded comment/reply counts over cached columns', () => {
  const row = makeRow({
    count_of_comments: 0,
    count_of_replies: 0,
    comments: [{ count: 5 }],
    replies: [{ count: 3 }],
  });
  const post = mapRowToPost(row);
  expect(post.countOfComments).toBe(5);
  expect(post.countOfReplies).toBe(3);
});
```

#### Step 2: Run the test to verify it fails

Run: `pnpm --filter web test:run -- --reporter=verbose supabaseReads.test`
Expected: FAIL — `mapRowToPost` ignores `comments`/`replies` arrays, returns 0.

#### Step 3: Update PostRowWithEmbeds type

Add embedded count arrays to the interface at `apps/web/src/shared/api/supabaseReads.ts:88`:

```typescript
  users?: { profile_photo_url: string | null } | { profile_photo_url: string | null }[];
  comments?: { count: number }[];   // ← ADD
  replies?: { count: number }[];    // ← ADD
}
```

#### Step 4: Update FEED_POST_SELECT to include embedded counts

Change `apps/web/src/shared/api/supabaseReads.ts:95`:

```typescript
export const FEED_POST_SELECT = 'id, board_id, author_id, author_name, title, content_preview, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at, comments(count), replies(count)';
```

This auto-covers all 3 callers: `fetchRecentPostsFromSupabase`, `fetchBestPostsFromSupabase`, and `useUserPosts.ts`.

#### Step 5: Update mapRowToPost to prefer live counts

Change `apps/web/src/shared/api/supabaseReads.ts:572-574`:

```typescript
  // Prefer live embedded counts (PostgREST aggregates) over cached counter columns
  const commentCount = row.comments?.[0]?.count ?? row.count_of_comments ?? 0;
  const replyCount = row.replies?.[0]?.count ?? row.count_of_replies ?? 0;
```

#### Step 6: Run tests to verify they pass

Run: `pnpm --filter web test:run -- --reporter=verbose supabaseReads.test`
Expected: ALL PASS

#### Step 7: Run full test suite

Run: `pnpm --filter web test:run`
Expected: ALL PASS (including `apps/web/src/post/model/Post.test.ts` which also calls `mapRowToPost`)

#### Step 8: Commit

```bash
git add apps/web/src/shared/api/supabaseReads.ts apps/web/src/shared/api/supabaseReads.test.ts
git commit -m "fix: use live embedded counts for comment/reply in PostCardFooter

The apps/web mapRowToPost was reading only stale cached counter columns
(count_of_comments, count_of_replies) which were mostly 0. Switch to
live PostgREST embedded counts — comments(count), replies(count) — with
cached columns as fallback. Covers feed queries (fetchRecentPosts,
fetchBestPosts) and useUserPosts."
```

---

### Task 2: Add live counts to post detail query

**Files:**
- Modify: `apps/web/src/post/utils/postUtils.ts:13`

The `fetchPost` detail query uses `select('*')` which fetches cached columns but NOT PostgREST embedded counts. After Task 1, the detail page would still show stale numbers.

#### Step 1: Update fetchPost select to include embedded counts

Change `apps/web/src/post/utils/postUtils.ts:13`:

```typescript
  const { data, error } = await supabase
    .from('posts')
    .select('*, boards(first_day), users!author_id(profile_photo_url), comments(count), replies(count)')
    .eq('id', postId)
    .eq('board_id', boardId)
    .single();
```

#### Step 2: Run tests

Run: `pnpm --filter web test:run`
Expected: ALL PASS

#### Step 3: Commit

```bash
git add apps/web/src/post/utils/postUtils.ts
git commit -m "fix: add live comment/reply counts to post detail query

fetchPost used select('*') which only fetches cached counter columns.
Add comments(count) and replies(count) embeds for consistency with
feed queries."
```

---

## PR 2: Delete legacy src/ directory (separate PR)

### Task 3: Inline root src/ dependencies into apps/web

Two files in `apps/web/` import directly from root `src/` via relative paths:

- `apps/web/src/post/constants/typography.ts` → re-exports from `../../../../../src/post/constants/typography`
- `apps/web/src/post/utils/contentUtils.ts` → re-exports from `../../../../../src/post/utils/contentUtils`

**Files:**
- Rewrite: `apps/web/src/post/constants/typography.ts`
- Rewrite: `apps/web/src/post/utils/contentUtils.ts`

#### Step 1: Inline typography.ts

Replace `apps/web/src/post/constants/typography.ts` with the actual implementation (3 lines):

```typescript
// W3C klreq 및 CJK 타이포그래피 권장 사항에 기반한 한국어 최적 줄 간격
// https://www.w3.org/International/klreq/
export const KOREAN_OPTIMAL_LINE_HEIGHT = 1.7;
```

#### Step 2: Inline contentUtils.ts

Replace `apps/web/src/post/utils/contentUtils.ts` with the full implementation from `src/post/utils/contentUtils.ts` (388 lines). Copy the file contents verbatim — it has no dependencies on root `src/` (only `dompurify`).

#### Step 3: Run tests

Run: `pnpm --filter web test:run`
Expected: ALL PASS

#### Step 4: Run type-check

Run: `pnpm --filter web type-check`
Expected: PASS

#### Step 5: Commit

```bash
git add apps/web/src/post/constants/typography.ts apps/web/src/post/utils/contentUtils.ts
git commit -m "refactor: inline root src/ dependencies into apps/web

Two files in apps/web imported from root src/ via relative paths.
Inline the actual implementations to break the dependency before
deleting the root src/ directory."
```

---

### Task 4: Update root components.json and delete src/

**Files:**
- Modify or delete: `components.json` (root)
- Delete: entire `src/` directory

#### Step 1: Check if apps/web has its own components.json

Run: `ls apps/web/components.json 2>/dev/null`

If it exists, the root `components.json` is redundant and can be deleted.
If not, move it to `apps/web/` and update its `css` path.

#### Step 2: Verify no other references to root src/

```bash
# Check for relative imports from root src/
grep -r '../../../../../src/' apps/ 2>/dev/null

# Check CI
grep -r ' src/' .github/ 2>/dev/null | grep -v node_modules
```

Expected: No references (after Task 3 inlined the two files).

#### Step 3: Delete root components.json (if redundant) and src/

```bash
rm components.json  # if apps/web/ has its own
rm -rf src/
```

#### Step 4: Run full validation

Run: `pnpm --filter web validate`
Expected: lint + type-check + tests all pass

#### Step 5: Commit

```bash
git add -A
git commit -m "chore: remove legacy root src/ directory

The root src/ was a pre-monorepo mirror of apps/web/src/ that had
diverged — apps/web/src/ was missing live comment count queries that
src/ already had. With dependencies inlined (previous commit) and no
build targets referencing it, removing src/ prevents future drift."
```

---

## Summary

| PR | Task | Purpose | Risk |
|----|------|---------|------|
| 1 | 1 | Fix bug: live embedded counts in feed queries | Low |
| 1 | 2 | Fix bug: live embedded counts in detail query | Low |
| 2 | 3 | Inline root src/ dependencies into apps/web | Low |
| 2 | 4 | Delete root src/ + components.json cleanup | Low (verified) |

**Follow-up tickets:**
- Investigate broken counter triggers (migration 20260222) — `count_of_comments` is 0 for all posts
- Fix admin app stale cached columns
