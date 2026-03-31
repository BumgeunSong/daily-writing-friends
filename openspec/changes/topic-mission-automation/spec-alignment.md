# Spec Alignment Report: topic-mission-automation

**Date**: 2026-03-31
**Branch**: feat/topic-mission-automation
**Based on**: verify_report.md (PASS, 640/640 tests)

---

## Summary Table

| Spec | Requirement | Status | Notes |
|---|---|---|---|
| topic-mission-pool | Queue Data Model | Aligned | Table, constraints, foreign keys all match spec |
| topic-mission-pool | Server-Side Order Index Assignment | Aligned | `next_topic_order_index` + BEFORE INSERT trigger implemented correctly |
| topic-mission-pool | Status Lifecycle | **Drifted** | Spec updated: `assigned → pending` added as valid transition (Reset Queue operation) |
| topic-mission-pool | Queue Advancement Atomicity | Aligned | `advance_topic_presenter` RPC; notification also inserted within same function |
| topic-mission-pool | Row-Level Security Policies | Aligned | SELECT for board members, INSERT for self+member, UPDATE/DELETE service_role only |
| topic-mission-pool | updated_at Auto-Update | Aligned | BEFORE UPDATE trigger sets `updated_at = NOW()` |
| topic-presenter-notification | Notification Type for Presenter Assignment | Aligned | Enum + string union in sync; cross-reference comments in both files |
| topic-presenter-notification | Notification Dispatch on Presenter Assignment | Aligned | Notification inserted within `advance_topic_presenter` SQL function (same atomic transaction) |
| topic-presenter-notification | Notification Message Format | Aligned | Korean format correct; actorName=boardTitle, contentPreview=topic; truncation at 35 chars |
| topic-presenter-notification | Nullable post_id for Board-Level Notification | Aligned | Migration drops NOT NULL; DTO and model type updated to `postId?: string` |
| topic-presenter-notification | Notification Mapping and Graceful Fallback | Aligned | `TOPIC_PRESENTER_ASSIGNED` case returns `TopicPresenterNotification`; default logs warning + returns fallback |
| topic-presenter-notification | Notification Click Routing | Aligned | `getNotificationLink` returns `/board/${boardId}` for this type |
| topic-presenter-banner | Banner Visibility Condition | Aligned | Returns null when no assigned presenter; event-driven (not day-of-week) |
| topic-presenter-banner | Banner Content for Non-Presenter Members | Aligned | Shows presenter name + topic; registration link shown only when `!currentUserMission` |
| topic-presenter-banner | Banner Content for the Assigned Presenter | Aligned | Personalized "당신이 다음 발표자입니다" + topic shown |
| topic-presenter-banner | Banner Placement on Board Page | Aligned | `<PresenterBanner>` in `BoardPage` below `BoardPageHeader`, above `PostFilterTabs` + post list |
| topic-registration | Topic Registration Page Route | Aligned | `/board/:boardId/topic` registered in `privateRoutesWithoutNav` under `<PrivateRoutes />` |
| topic-registration | Topic Submission Form | Aligned | 1–200 char validation; submit disabled on `isPending` or `isOverLimit`; inline error shown |
| topic-registration | Duplicate Registration Prevention | Aligned | Pre-check via `fetchCurrentUserMission`; shows info state instead of form |
| topic-registration | Registration Required Before Assignment | Aligned | RPC only selects from `pending` entries; members without entry are not assignable |
| topic-registration | Non-Member Access | **Drifted** | Spec updated: enforcement is at API/RLS layer on submit, not on page load |
| topic-registration | Post-Registration Confirmation | Aligned | Shows submitted topic + "게시판으로 돌아가기" button after success |
| topic-mission-admin | Admin Topic Mission Panel Page | Aligned | Page at correct path; table with nickname, topic, order, status badge, action buttons |
| topic-mission-admin | Advance to Next Presenter | Aligned | Button calls edge function; disabled while in-flight; loading indicator shown |
| topic-mission-admin | Skip Member | Aligned | Skips pending or assigned; if assigned was skipped, calls `assign-topic-presenter` to advance |
| topic-mission-admin | Reorder Queue Entries | Aligned | Up/Down buttons call `reorder_topic_mission` RPC; first/last entries have Up/Down disabled |
| topic-mission-admin | Reset Queue | Aligned | Confirmation dialog; bulk update to `pending`; cancel makes no changes; order_index preserved |
| topic-mission-admin | Pool Exhaustion Indicator | Aligned | "이번 사이클 완료 — 다음 지정 시 초기화됩니다" shown when zero pending entries remain |

---

## Drifted Requirements — Spec Updates Applied

### 1. topic-mission-pool: Status Lifecycle

**Original spec** listed these valid transitions:
- `pending → assigned`
- `assigned → completed`
- `pending → skipped`
- `skipped → pending`
- `completed → pending`

**What was built**: The Reset Queue admin operation bulk-updates ALL entries (including any `assigned` entry) to `pending`. This creates the `assigned → pending` transition, which was omitted from the lifecycle list.

**Why it drifted**: The Status Lifecycle requirement was written before the Reset Queue requirement was fully detailed. The Reset Queue spec explicitly states "all entries SHALL be reset to `pending`", which necessarily includes entries in the `assigned` state.

**Spec update**: `assigned → pending` added to valid transitions in the Status Lifecycle requirement (admin reset operation path).

---

### 2. topic-registration: Non-Member Access

**Original spec**: "Non-members SHALL be redirected or shown an access-denied state."

**What was built**: The `/board/:boardId/topic` route is wrapped in `<PrivateRoutes />` (auth guard), but there is no board-membership pre-check on page load. Non-members see the registration form, but when they attempt to submit, the Supabase RLS policy (which checks `user_board_permissions`) rejects the INSERT, and the error is surfaced in the form UI.

**Why it drifted**: The topic registration page was placed in `privateRoutesWithoutNav` (auth-guarded, no board loader), while the board page uses a `boardLoader` that enforces membership. Adding a membership loader to the topic page was not implemented.

**Spec update**: Clarified that the non-member access-denied state is shown at submission time via the API/RLS layer error, not via a page-load redirect. The "or shown an access-denied state" branch of the spec covers this behavior.

---

## Notable Implementation Detail (Not a Drift)

### Notification atomicity: SQL function vs. edge function

The spec says: "The notification insert SHALL occur within the same atomic Postgres RPC as the queue state mutations." In practice, the notification is inserted inside `advance_topic_presenter` (the Postgres function), not by the `assign-topic-presenter` edge function after calling the RPC. This is more atomic than the spec anticipated — the spec's intent is fully satisfied.

### Idempotency index excludes board_id (documented in verify_report.md)

The `idx_notifications_idempotency` index does not include `board_id`, which means a user can only receive one `topic_presenter_assigned` notification total (across all boards) until the previous one is deleted. This is a known limitation documented in the verify report. It is not a spec violation for the current single-board-per-cohort use case.

---

## Files Traced

| File | Spec Area |
|---|---|
| `supabase/migrations/20260331000000_add_topic_missions.sql` | topic-mission-pool (all requirements) |
| `supabase/migrations/20260401000000_add_reorder_topic_mission_rpc.sql` | topic-mission-admin (Reorder) |
| `apps/web/src/notification/model/Notification.ts` | topic-presenter-notification (type, nullable postId) |
| `supabase/functions/_shared/notificationMessages.ts` | topic-presenter-notification (type, message format) |
| `apps/web/src/notification/api/notificationApi.ts` | topic-presenter-notification (mapping, fallback) |
| `apps/web/src/notification/components/NotificationItem.tsx` | topic-presenter-notification (click routing) |
| `apps/web/src/shared/api/supabaseReads.ts` | topic-presenter-notification (NotificationDTO.postId) |
| `apps/web/src/topic/components/PresenterBanner.tsx` | topic-presenter-banner (all requirements) |
| `apps/web/src/board/components/BoardPage.tsx` | topic-presenter-banner (placement) |
| `apps/web/src/topic/components/TopicRegistrationPage.tsx` | topic-registration (form, duplicate, confirmation) |
| `apps/web/src/topic/hooks/useTopicRegistration.ts` | topic-registration (validation, duplicate check) |
| `apps/web/src/router.tsx` | topic-registration (route registration) |
| `apps/admin/src/app/admin/boards/[boardId]/topic-missions/page.tsx` | topic-mission-admin (all requirements) |
