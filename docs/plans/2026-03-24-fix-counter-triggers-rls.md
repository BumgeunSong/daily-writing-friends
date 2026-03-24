# Fix Counter Triggers Blocked by RLS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix Postgres counter triggers (`count_of_comments`, `count_of_replies`, `count_of_likes`) that silently fail due to RLS policies, then backfill stale data.

**Architecture:** The trigger functions run as the calling user (SECURITY INVOKER by default). When User A comments on User B's post, the trigger's `UPDATE posts SET count_of_comments = ...` is blocked by RLS (`auth.uid() = author_id`). Fix by making counter trigger functions `SECURITY DEFINER` so they bypass RLS. Then backfill all stale counters.

**Tech Stack:** Supabase Postgres, SQL migrations

**Root cause timeline:**
- Feb 22: Counter triggers + RLS created in same migration (oversight: triggers not SECURITY DEFINER)
- Feb 28: UID remapped, triggers re-enabled
- Mar 1: RLS re-enabled with UUID-native policies → counters broke
- Mar 6: Last correct cached counts (likely self-comments)
- Mar 23+: All `count_of_comments = 0` for new comments

---

## Task 1: Create migration to fix trigger functions

**Files:**
- Create: `supabase/migrations/[timestamp]_fix_counter_triggers_security_definer.sql`

### Step 1: Write the migration

Create a new migration file. The migration does three things:
1. Recreate counter functions with `SECURITY DEFINER`
2. Backfill stale `count_of_comments` and `count_of_replies` on `posts`
3. Backfill stale `count_of_replies` on `comments`
4. Recalculate `engagement_score` for affected posts

```sql
-- Fix counter triggers blocked by RLS
--
-- Root cause: trigger functions run as SECURITY INVOKER (default).
-- When User A comments on User B's post, the trigger's UPDATE on posts
-- is blocked by RLS policy "Users can update their own posts"
-- (auth.uid() = author_id). The UPDATE silently does nothing.
--
-- Fix: SECURITY DEFINER makes the function run as the function owner
-- (postgres), bypassing RLS. This is safe because:
--   1. The triggers only increment/decrement counters
--   2. They only fire on INSERT/DELETE of comments/replies/likes
--   3. The counter columns are not user-editable via the API

-- =============================================
-- 1. Fix counter trigger functions
-- =============================================

-- Comments counter on posts
CREATE OR REPLACE FUNCTION update_post_comment_count() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET count_of_comments = count_of_comments + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET count_of_comments = GREATEST(count_of_comments - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Replies counter on posts
CREATE OR REPLACE FUNCTION update_post_reply_count() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET count_of_replies = count_of_replies + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET count_of_replies = GREATEST(count_of_replies - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Replies counter on comments
CREATE OR REPLACE FUNCTION update_comment_reply_count() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET count_of_replies = count_of_replies + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET count_of_replies = GREATEST(count_of_replies - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Likes counter on posts
CREATE OR REPLACE FUNCTION update_post_like_count() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET count_of_likes = count_of_likes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET count_of_likes = GREATEST(count_of_likes - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. Backfill stale counters
-- =============================================

-- Fix posts.count_of_comments
UPDATE posts p
SET count_of_comments = sub.cnt
FROM (SELECT post_id, count(*)::int AS cnt FROM comments GROUP BY post_id) sub
WHERE p.id = sub.post_id AND p.count_of_comments != sub.cnt;

-- Fix posts.count_of_replies
UPDATE posts p
SET count_of_replies = sub.cnt
FROM (SELECT post_id, count(*)::int AS cnt FROM replies GROUP BY post_id) sub
WHERE p.id = sub.post_id AND p.count_of_replies != sub.cnt;

-- Fix posts.count_of_likes
UPDATE posts p
SET count_of_likes = sub.cnt
FROM (SELECT post_id, count(*)::int AS cnt FROM likes GROUP BY post_id) sub
WHERE p.id = sub.post_id AND p.count_of_likes != sub.cnt;

-- Fix comments.count_of_replies
UPDATE comments c
SET count_of_replies = sub.cnt
FROM (SELECT comment_id, count(*)::int AS cnt FROM replies GROUP BY comment_id) sub
WHERE c.id = sub.comment_id AND c.count_of_replies != sub.cnt;

-- Zero out counters for posts with no comments/replies/likes
-- (handles case where all comments were deleted but counter > 0)
UPDATE posts SET count_of_comments = 0
WHERE count_of_comments > 0 AND id NOT IN (SELECT DISTINCT post_id FROM comments);

UPDATE posts SET count_of_replies = 0
WHERE count_of_replies > 0 AND id NOT IN (SELECT DISTINCT post_id FROM replies);

UPDATE posts SET count_of_likes = 0
WHERE count_of_likes > 0 AND id NOT IN (SELECT DISTINCT post_id FROM likes);

-- Engagement score is auto-recalculated by trg_engagement_score
-- (fires on UPDATE OF count_of_comments, count_of_replies, count_of_likes)
```

### Step 2: Verify the migration SQL is syntactically correct

Review the SQL for:
- `SET search_path = public` on all SECURITY DEFINER functions (prevents search_path injection)
- Correct column references (no ambiguous `post_id`)
- Backfill uses subquery join pattern (not correlated subquery) for performance

### Step 3: Commit

```bash
git add supabase/migrations/
git commit -m "fix: make counter triggers SECURITY DEFINER to bypass RLS

Counter triggers (comment/reply/like counts) silently failed when a
user other than the post author triggered them, because RLS policy
'Users can update their own posts' blocked the UPDATE. SECURITY DEFINER
makes the function run as the owner (postgres), bypassing RLS.

Also backfills all stale counters and recalculates engagement scores."
```

---

## Task 2: Verify fix on production

### Step 1: Apply the migration

Run via Supabase Dashboard SQL Editor or `supabase db push`.

### Step 2: Verify backfill worked

```sql
-- Should return 0 rows (no mismatches)
SELECT p.id, p.title, p.count_of_comments, actual.cnt
FROM posts p
JOIN (SELECT post_id, count(*) AS cnt FROM comments GROUP BY post_id) actual
  ON p.id = actual.post_id
WHERE p.count_of_comments != actual.cnt
LIMIT 10;
```

### Step 3: Test trigger works for cross-user comments

1. As User A, add a comment on User B's post
2. Check that `posts.count_of_comments` incremented
3. Delete the comment
4. Check that `posts.count_of_comments` decremented

---

## Summary

| Task | Purpose | Risk |
|------|---------|------|
| 1 | SECURITY DEFINER + backfill migration | Low — only affects counter columns, no user data |
| 2 | Production verification | Zero — read-only checks |

## Security notes

`SECURITY DEFINER` is safe here because:
- Functions only do `+1` / `-1` on counter columns
- They only fire on `INSERT/DELETE` triggers (not callable directly)
- `SET search_path = public` prevents search_path injection attacks
- Counter columns are not exposed as writable via the PostgREST API
