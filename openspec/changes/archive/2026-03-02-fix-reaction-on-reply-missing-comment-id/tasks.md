## 1. Fix Edge Function

- [x] 1.1 In `supabase/functions/create-notification/index.ts`, add `comment_id` to the `replies` SELECT in the `reaction_on_reply` case (line 106)
- [x] 1.2 Set `commentId = reply?.comment_id || null` after fetching the reply (after line 109)

## 2. Backfill Migration

- [x] 2.1 Create SQL migration to backfill `comment_id` on existing `reaction_on_reply` notifications by joining `notifications.reply_id` → `replies.comment_id`
- [x] 2.2 In the same migration, delete orphaned `reaction_on_reply` notification rows where the referenced reply no longer exists

## 3. Deploy

- [x] 3.1 Deploy the Edge Function: `supabase functions deploy create-notification`
- [x] 3.2 Run the backfill migration against production

## Tests

### Unit
- [x] T.1 Verify `mapDTOToNotification` test covers `REACTION_ON_REPLY` with both `commentId` and `replyId` present (Vitest)
- [x] T.2 Verify `mapDTOToNotification` test covers `REACTION_ON_REPLY` throwing when `commentId` is missing (Vitest)

### Integration

(not applicable — Edge Function runs in Deno runtime)

### E2E

(post-deploy verification via Sentry monitoring — confirm error stops recurring)
