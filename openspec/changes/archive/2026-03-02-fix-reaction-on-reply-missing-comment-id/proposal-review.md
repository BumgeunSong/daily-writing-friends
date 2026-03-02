## Review Summary

**Status**: Ready
**Iteration**: 1 of max 2

## Findings

### Critical

(none)

### Important

- **Backfill must handle missing replies**: If the original reply has been deleted, the backfill migration can't resolve `comment_id` from the `replies` table. The backfill should skip or delete orphaned notification rows gracefully.

### Minor

- **DB trigger could also pass `comment_id`**: The `notify_on_reaction()` trigger could be updated to include `comment_id` directly from the `reactions` row (if the reactions table has it), reducing one query in the Edge Function. However, fetching it from `replies` in the Edge Function is simpler and avoids a migration to alter the trigger.

## Key Questions Raised

1. Are there other notification types with similar missing-field bugs in the Supabase path? (Checked: `reaction_on_comment` and `reply_on_comment` cases correctly set their required fields from the payload/lookup. Only `reaction_on_reply` is affected.)

## Alternatives Considered

- **Make `commentId` optional on `REACTION_ON_REPLY` type**: Rejected — the comment is needed for navigation (tapping notification → scroll to the correct comment thread). Loosening the type hides a real data gap.
- **Do nothing (Cloud Function path works)**: Rejected — the Supabase-native trigger path is the intended long-term path as Firebase Cloud Functions are being retired.

## Accepted Trade-offs

- Not changing the DB trigger (keeping the fix in the Edge Function only) means one extra query per `reaction_on_reply` notification. Acceptable given the low frequency of this notification type.

## Revision History

- Round 1: Proposal is clear and correctly scoped. No revisions needed.
