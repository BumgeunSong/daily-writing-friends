## ADDED Requirements

### Requirement: Edge Function MUST populate comment_id for reaction_on_reply notifications

The `create-notification` Edge Function SHALL fetch `comment_id` from the `replies` table when creating a `reaction_on_reply` notification. The resulting notification row MUST have both `comment_id` and `reply_id` populated.

#### Scenario: Reaction on a reply creates notification with comment_id
- **WHEN** a user reacts to a reply that belongs to comment `C1`
- **THEN** the notification row MUST have `comment_id = C1` and `reply_id` set to the reply's ID

#### Scenario: Reaction on a reply where reply lookup fails
- **WHEN** a user reacts to a reply but the reply cannot be found in the `replies` table
- **THEN** the Edge Function MUST skip notification creation (no row inserted)

### Requirement: Backfill migration MUST fix existing broken notification rows

A SQL migration SHALL populate `comment_id` on all existing `reaction_on_reply` notification rows where `comment_id IS NULL`, by joining on the `replies` table via `reply_id`.

#### Scenario: Backfill resolves comment_id from existing reply
- **WHEN** a notification row has `type = 'reaction_on_reply'` AND `comment_id IS NULL` AND the referenced reply still exists
- **THEN** the migration MUST set `comment_id` to the reply's `comment_id`

#### Scenario: Backfill handles orphaned notifications (reply deleted)
- **WHEN** a notification row has `type = 'reaction_on_reply'` AND `comment_id IS NULL` AND the referenced reply no longer exists
- **THEN** the migration MUST delete the orphaned notification row
