# Handoff: topic-mission-automation — Design Review Session

## What was done

- Comprehensive design review from 5 perspectives (Architecture, Security, Quality, Testability, Integration)
- Found 1 Critical + 11 Important + 13 Minor issues in Round 1
- Updated `design.md` to address all Critical and Important findings
- Re-reviewed updated design (Round 2) — all Critical/Important resolved
- Wrote final `design-review.md` with both rounds documented

## Files changed

- **Modified**: `openspec/changes/topic-mission-automation/design.md` — addressed 12 review findings
- **Created**: `openspec/changes/topic-mission-automation/design-review.md` — full 5-perspective review with Round 1 + Round 2
- **Modified**: `openspec/changes/topic-mission-automation/handoff.md` — this file

## Key decisions

1. `NotificationBase.postId` and `NotificationDTO.postId` must become optional (`string | undefined`) to support board-level notifications
2. `mapDTOToNotification` default case changed from `throw` to graceful fallback (logged warning + generic notification) for deployment safety
3. `buildNotificationMessage` reuses existing `(type, actorName, contentPreview)` signature with `actorName=boardTitle`, `contentPreview=topic`
4. `order_index` assigned by DB trigger (not client) to prevent race conditions and queue-jumping
5. RLS policies specified with exact SQL using `user_board_permissions` join
6. All DB mutations in `assign-topic-presenter` wrapped in a single Postgres RPC for atomicity
7. `computeNextAssignment` extracted as pure function for unit testing
8. Deployment order: DB migration first, then edge function + web + admin together
9. Admin E2E test flows added (advance, skip, reset)

## Notes for next session

- Design is ready for task breakdown (next OpenSpec phase)
- 5 minor accepted trade-offs documented in design-review.md — implementation-level concerns
- The `updated_at` trigger should be included in the migration (currently noted with conditional language)
- `next_topic_order_index` SQL function may need `FOR UPDATE` locking if concurrency becomes a concern
- Admin app CLAUDE.md describes Firebase-primary but Supabase integration already exists — no blockers
- Open questions remaining: skipped entries inclusion/exclusion in wrap-around; admin reorder UX (up/down vs. drag-and-drop); personalized banner copy for assigned presenter vs. other members
