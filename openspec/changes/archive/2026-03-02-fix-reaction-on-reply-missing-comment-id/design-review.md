## Review Summary

**Status**: Ready
**Iteration**: 1 of max 2

## Architecture

No concerns. The fix stays within the existing Edge Function pattern — adding a column to an existing `SELECT` query. No new boundaries or interfaces introduced.

## Security

No concerns. The Edge Function already validates `service_role` JWT. The backfill migration runs as postgres. No new trust boundaries.

## Quality & Performance

No concerns. Adding `comment_id` to the existing `replies` SELECT adds zero overhead (same row, one more column). The backfill is a one-time operation.

## Testability

- `mapDTOToNotification` unit tests already exist — verify coverage for the `REACTION_ON_REPLY` case with valid data and the error case.
- Edge Function is not locally testable (Deno runtime). Manual verification via Sentry monitoring after deploy.
- Backfill migration testable against Supabase local Docker.

## API & Integration

No API contract changes. The notification row schema is unchanged — `comment_id` was always an expected column, it was just not being populated for this notification type.

## Consolidated Findings

### Critical

(none)

### Important

(none)

### Minor

- The existing `mapDTOToNotification` test file should be checked to confirm it covers `REACTION_ON_REPLY` with both fields present and the error throw case. If missing, add during implementation.

## Accepted Trade-offs

- Not modifying the DB trigger to pass `comment_id` — keeps the fix minimal and avoids a trigger migration.
- Edge Function is not locally testable — verified via production monitoring post-deploy.

## Revision History

- Round 1: Design is clean and minimal. No revisions needed.
