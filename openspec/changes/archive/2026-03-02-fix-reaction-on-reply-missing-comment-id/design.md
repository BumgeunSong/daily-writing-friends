## Context

`REACTION_ON_REPLY` notifications created via the Supabase-native path (DB trigger → Edge Function) are missing `comment_id`. The DB trigger `notify_on_reaction()` only sends `reply_id`, and the Edge Function's `reaction_on_reply` handler never fetches `comment_id` from the `replies` table. The read path (`mapDTOToNotification`) correctly requires both `commentId` and `replyId`, so affected rows throw at fetch time, breaking the notifications page.

The Cloud Function write path (`onReactionCreatedOnReply`) is unaffected — it gets `commentId` from the Firestore document path.

## Goals / Non-Goals

**Goals:**
- Fix the Edge Function to include `comment_id` when creating `reaction_on_reply` notifications
- Backfill `comment_id` on existing broken notification rows

**Non-Goals:**
- Changing the DB trigger to pass `comment_id` (adds migration complexity for minimal gain)
- Fixing the secondary "[object Object]" error formatting (separate concern in `queryErrorTracking.ts`)
- Modifying the Cloud Function path (already works correctly)

## Decisions

### 1. Fix in Edge Function, not in DB trigger

**Choice**: Fetch `comment_id` from the `replies` table inside the Edge Function.

**Why**: The `replies` table already has `comment_id`. Adding it to the `SELECT` is a one-line change. Modifying the DB trigger would require a SQL migration and the Edge Function would still need to handle payloads both with and without `comment_id` for backward compatibility.

### 2. Backfill via SQL migration

**Choice**: Write a SQL migration that joins `notifications` → `replies` to populate missing `comment_id` values.

**Why**: Direct SQL is the simplest path. Affected rows can be identified by `type = 'reaction_on_reply' AND comment_id IS NULL`. The `replies` table has `comment_id`, so the join is straightforward. Orphaned rows (where the reply was deleted) should be deleted since they can't be navigated to.

## Risks / Trade-offs

- **Deleted replies**: If a reply was deleted, backfill can't resolve `comment_id`. → Mitigation: Delete those orphaned notification rows (they're broken anyway).
- **One extra query**: The Edge Function now fetches `comment_id` from `replies` as part of the existing query (just adding a column to `SELECT`), so no additional query is needed.

## Testability Notes

### Unit (Layer 1)

- `mapDTOToNotification`: Already has tests. Verify the existing test covers the case where `REACTION_ON_REPLY` has both `commentId` and `replyId` present. Add a test that a row missing `commentId` throws.

### Integration (Layer 2)

(not applicable — the Edge Function runs in Supabase's Deno runtime and is not integration-testable locally)

### E2E Network Passthrough (Layer 3)

(not applicable for this fix)

### E2E Local DB (Layer 4)

- **Backfill migration**: Run the migration against Supabase local Docker and verify `comment_id` is populated for affected rows and orphaned rows are cleaned up.
