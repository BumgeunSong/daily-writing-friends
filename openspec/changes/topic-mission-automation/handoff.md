# Handoff: topic-mission-automation — Proposal Session

## What was done

Generated the proposal artifact for the `topic-mission-automation` OpenSpec change based on the user brief (issue #532).

## Files changed

- **Created**: `openspec/changes/topic-mission-automation/proposal.md`
- **Created**: `openspec/changes/topic-mission-automation/handoff.md` (this file)

## Key decisions

- **5 new capabilities identified** (all additive, no modifications to existing): `topic-mission-pool`, `topic-registration`, `topic-friday-banner`, `topic-presenter-notification`, `topic-mission-admin`
- No existing topic/mission feature was found in the codebase — the only related code is `topicInputUtils.ts` (character-limit utils for freewriting topic input, unrelated to this feature)
- The `NotificationType` enum will need a new `TOPIC_PRESENTER_ASSIGNED` value — noted in Impact section
- Admin app (`apps/admin/`) exists as a Next.js app; topic mission admin panel belongs there
- Edge function `create-notification` already exists in `supabase/functions/` — the new presenter notification can extend or follow its pattern
- No breaking changes to any existing tables, routes, or APIs

## Notes for next session

- **No `openspec/specs/` directory exists yet** — this change will create the first specs
- Each capability in the proposal becomes `openspec/specs/<capability-name>/spec.md`
- The `Board` model currently has no topic-related fields; the `topic_missions` table is a standalone table linked by `boardId`
- The `Notification` model is in `apps/web/src/notification/model/Notification.ts` — needs `TOPIC_PRESENTER_ASSIGNED` added
- Board page entry point is `apps/web/src/board/components/BoardPage.tsx` — Friday banner injection point
- Round-robin selection trigger strategy (scheduled vs. admin-triggered) was left open for the design phase
