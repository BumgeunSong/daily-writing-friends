# Handoff: topic-mission-automation

## Sessions completed

### Session 1 — Group 1: Database Migration (commit `c4f86586`)
- Created `supabase/migrations/20260331000000_add_topic_missions.sql`
- `topic_missions` table, indexes, RLS, triggers, `advance_topic_presenter` RPC
- `notifications.post_id` made nullable; type CHECK updated
- Key: `actor_id = recipient_id` for system notifications; idempotency index uses `COALESCE(post_id, '')`

### Session 2 — Group 2: Notification Model Extension (commit `4bccc5dc`)

All 8 tasks (2.1–2.8) + tests T.1, T.2, T.9–T.13 complete. 608 tests pass.

**Files changed:**
- `apps/web/src/notification/model/Notification.ts` — `TOPIC_PRESENTER_ASSIGNED` enum; `postId?: string` optional; `TopicPresenterNotification` interface + union
- `apps/web/src/shared/api/supabaseReads.ts` — `NotificationDTO.postId?: string`
- `supabase/functions/_shared/notificationMessages.ts` — added type to union; Korean message case with cross-reference comment
- `apps/web/src/notification/api/notificationApi.ts` — `TOPIC_PRESENTER_ASSIGNED` switch case; graceful `console.warn` fallback replaces `throw`
- `apps/web/src/notification/components/NotificationItem.tsx` — `getNotificationLink` routes `TOPIC_PRESENTER_ASSIGNED` to `/board/:boardId`

### Session 3 — Group 3: Edge Function assign-topic-presenter (commit `04b11c58`)

All 5 tasks (3.1–3.5) + tests T.3–T.6, T.14 complete. 619 Vitest tests pass.

**Files changed:**
- `supabase/functions/assign-topic-presenter/index.ts` — new edge function
- `supabase/functions/tests/assign-topic-presenter-test.ts` — Deno tests for T.14
- `supabase/config.toml` — `[functions.assign-topic-presenter]` with `verify_jwt = true`
- `apps/web/src/topic/utils/topicMissionLogic.ts` — `computeNextAssignment` + `isValidStatusTransition`
- `apps/web/src/topic/utils/topicMissionLogic.test.ts` — T.3–T.6

### Session 4 — Group 4: Web Topic Feature (commit `7c3703ee`)

All 7 tasks (4.1–4.7) + tests T.7, T.8 complete. 624 Vitest tests pass.

**Files changed:**
- `apps/web/src/topic/model/TopicMission.ts`
- `apps/web/src/topic/api/topicMissionApi.ts` + `topicMissionApi.test.ts`
- `apps/web/src/topic/hooks/useAssignedPresenter.ts`, `useTopicRegistration.ts`
- `apps/web/src/topic/components/TopicRegistrationPage.tsx`, `PresenterBanner.tsx`
- `apps/web/src/router.tsx` — `/board/:boardId/topic` route

### Session 5 — Group 5: Web: Board Page Integration (commit `9e4ce40f`)

Task 5.1 complete. `<PresenterBanner boardId={boardId} />` rendered in `BoardPage`.

### Session 6 — Group 6: Admin Topic Mission Panel (commit `9f58b314`)

All 7 tasks (6.1–6.7) complete. 624 Vitest tests pass.

**Files changed:**
- `supabase/migrations/20260401000000_add_reorder_topic_mission_rpc.sql`
- `apps/admin/src/apis/supabase-reads.ts`
- `apps/admin/src/app/admin/boards/[boardId]/topic-missions/page.tsx`

### Session 7 — Group Tests: T.15–T.27 (commit `bb0fb8f5`)

All 13 remaining E2E and DB tests complete. 624 Vitest tests still pass.

**Files created:**
- `tests/utils/topic-mission-helpers.ts` — service_role REST helpers for test data setup
- `tests/topic-presenter-banner.spec.ts` — T.15–T.19 Playwright E2E (PresenterBanner)
- `tests/topic-mission-admin.spec.ts` — T.20–T.22 admin action → web app state
- `tests/topic-mission-db.spec.ts` — T.23–T.27 Supabase-local DB tests (no browser)

**Key decisions:**
- T.20–T.22: Admin panel UI not tested (separate Next.js app not in this Playwright webServer config). Admin actions simulated via service_role REST API; web app resulting state verified in the browser.
- Board IDs use `Date.now()` suffix to avoid cross-browser-project data collisions when Playwright runs chromium/firefox/webkit in parallel.
- T.26: uses `advanceTopicPresenter` RPC via service_role (inserts notification with `post_id = NULL`), then verifies via REST query.

## Status

**ALL TASKS COMPLETE** — all 63/63 tasks (T.1–T.27) are checked off in tasks.md.
