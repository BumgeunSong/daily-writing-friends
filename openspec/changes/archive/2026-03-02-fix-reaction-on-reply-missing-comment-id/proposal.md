## Why

`REACTION_ON_REPLY` notifications created via the Supabase Edge Function (`create-notification`) are missing `comment_id`, causing `mapDTOToNotification` to throw at read time. This breaks the notifications page for any user who received a reaction on a reply. The Cloud Function write path is unaffected because it gets `commentId` from the Firestore document path, but the Supabase-native path (triggered by `notify_on_reaction()` DB trigger) never fetches or passes `comment_id`.

## What Changes

- Fix the `reaction_on_reply` case in the Supabase Edge Function to fetch `comment_id` from the `replies` table and include it in the notification row.
- Add a one-time SQL migration to backfill `comment_id` on existing `REACTION_ON_REPLY` notification rows that are missing it.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none — this is a data-flow bug fix, not a behavioral change)

## Impact

- **Supabase Edge Function**: `supabase/functions/create-notification/index.ts` — `reaction_on_reply` case
- **Database**: One-time backfill migration for affected notification rows
- **Users affected**: Any user with a `REACTION_ON_REPLY` notification created via the Supabase path (those rows currently crash the notifications page)
