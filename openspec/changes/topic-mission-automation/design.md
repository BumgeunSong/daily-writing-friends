# Design: topic-mission-automation

## Context

**Background**: Daily Writing Friends cohorts run weekly topic presentations. Presenter selection is currently ad-hoc (admins choose manually and send reminders individually). This creates coordination overhead and inconsistent turn-taking.

**Current state**: No topic mission infrastructure exists. The `notifications` table serves as a materialized inbox for post/comment/reaction events. The `create-notification` edge function is called via pg_net DB triggers (service_role only). No scheduling infrastructure (pg_cron or external cron) exists in the current stack.

**Constraints**:
- Admin-triggered advancement only (no automatic scheduling)
- Fully additive — no changes to existing tables or APIs
- `notifications.post_id` is currently `NOT NULL`; topic notifications are board-level, not post-level → requires a targeted schema migration
- Two files maintain `NotificationType` independently: `apps/web/src/notification/model/Notification.ts` (enum) and `supabase/functions/_shared/notificationMessages.ts` (string union) — both must be updated in sync
- `NotificationBase.postId` and `NotificationDTO.postId` are currently non-optional `string` — must become `string | undefined` to support board-level notifications
- `mapDTOToNotification` exhaustive `default: never` check will throw at runtime on unknown types — deployment must be coordinated or a graceful fallback added
- `create-notification` edge function hard-requires `boardId && postId` (line 133) — NOT reused for topic notifications; a separate edge function is required

**Stakeholders**: Board members (register topics, receive presenter assignments), admins (manage queue, advance/skip, reset).

---

## Goals / Non-Goals

**Goals**:
- `topic_missions` table with `pending → assigned → completed → skipped` lifecycle and wrap-around on pool exhaustion
- In-app topic registration page at `/board/:boardId/topic` (member self-service)
- Presenter banner on board page, shown event-driven (whenever a presenter is `assigned`)
- System notification to assigned presenter with deep link to board
- Admin panel to view queue, advance to next, skip, reorder, and reset

**Non-Goals**:
- Automatic/scheduled presenter advancement (can be added later)
- Editing a submitted topic after registration
- Multiple queue slots per user per board per cycle
- Friday-specific or date-based banner logic (deferred, event-driven is preferred)

---

## Decisions

### 1. Event-driven banner, not day-based

**Decision**: Show the banner whenever a `topic_missions` entry has `status = 'assigned'` for the board.

**Why over Friday-only**: Hardcoding a weekday couples the feature to one cohort's schedule. If the presentation day changes, the banner would break silently. Event-driven is simpler, more flexible, and requires no time-zone logic.

**Alternatives considered**: Day-based display (e.g., only Fridays) — rejected because it creates implicit coupling to cohort schedule and requires server-side timezone awareness.

### 2. Separate registration page, not a modal

**Decision**: Topic registration lives at `/board/:boardId/topic` (separate page).

**Why**: Deep-linkable from notifications (the presenter notification points the user to the board, and the banner from there links to the registration page). A modal on the board page would require the board page to carry extra state and is harder to link to directly.

**Alternatives considered**: Modal/bottom sheet on board page — lower friction for already-on-board users, but not linkable from notifications and hides the registration path from users arriving via deep link.

### 3. New `assign-topic-presenter` edge function for advancement + notification

**Decision**: Admin advancement calls a new Supabase edge function `assign-topic-presenter` (via service_role from admin app), which atomically handles: setting the current `assigned` entry to `completed`, finding the next `pending` entry, setting it to `assigned`, and inserting the presenter notification.

**Why over a DB trigger via pg_net**: Queue advancement requires multi-step logic (find next pending → handle wrap-around → notify). DB triggers can call pg_net but cannot coordinate multiple writes transactionally. A dedicated edge function keeps all advancement logic in one place, is testable in isolation, and avoids the complexity of chaining multiple triggers.

**Alternatives considered**: DB trigger on `topic_missions` status change → rejected because wrap-around logic (detecting pool exhaustion and resetting all entries) is difficult to express safely in a trigger function.

### 4. Nullable `post_id` in `notifications` for board-level notification type

**Decision**: Migration to make `notifications.post_id` nullable and update the `CHECK` constraint on `type` to include `topic_presenter_assigned`.

**Why**: `topic_presenter_assigned` is a board-level event — there is no post to reference. The notification deep link goes to `/board/:boardId`. Forcing a fake `post_id` would corrupt referential integrity and mislead the notification rendering logic.

**Migration scope**: `ALTER TABLE notifications ALTER COLUMN post_id DROP NOT NULL;` + update `CHECK (type IN (..., 'topic_presenter_assigned'))`.

**Alternatives considered**: Separate `board_notifications` table — overkill for one new type; would fragment the notification inbox and require client-side merging.

### 5. Reuse slot on wrap-around (status reset, not new row)

**Decision**: On wrap-around, reset `completed` and `skipped` entries back to `pending` in-place (via `UPDATE`). `order_index` is preserved. The same row's lifecycle restarts.

**Why**: Preserves the historical record of who presented in what order. Avoids foreign key cascades from DELETE/INSERT. Admin panel can show "cycle N" indicator based on wrap-around detection without needing new rows.

**Wrap-around trigger**: When `advance` is called and there are zero `pending` entries remaining after setting the current to `assigned` (i.e., this was the last pending entry), the edge function resets all `completed`/`skipped` entries for the board to `pending`.

### 6. UNIQUE constraint `(board_id, user_id)` on `topic_missions`

**Decision**: A member can only have one queue slot per board at a time. On wrap-around, the existing row is reused (status reset) rather than a new row inserted.

**Why**: Prevents duplicate entries and simplifies queue ordering. Members who want to change their topic must contact an admin (out of scope for self-service).

---

## Architecture

### Database

**New table: `topic_missions`**
```sql
CREATE TABLE topic_missions (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  board_id     TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic        TEXT NOT NULL,
  order_index  INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'assigned', 'completed', 'skipped')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);
```

**Indexes**:
- `(board_id, order_index)` — queue ordering
- `(board_id, status)` — find assigned presenter, find next pending

**RLS policies**:
- `SELECT`: board members can read their own board's entries:
  ```sql
  CREATE POLICY topic_missions_select ON topic_missions FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM user_board_permissions
      WHERE user_board_permissions.user_id = auth.uid()
        AND user_board_permissions.board_id = topic_missions.board_id
    ));
  ```
- `INSERT`: board members can insert for themselves (enforces `user_id = auth.uid()`):
  ```sql
  CREATE POLICY topic_missions_insert ON topic_missions FOR INSERT
    WITH CHECK (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_board_permissions
        WHERE user_board_permissions.user_id = auth.uid()
          AND user_board_permissions.board_id = topic_missions.board_id
      )
    );
  ```
- `UPDATE`/`DELETE`: service_role only (advancement and admin operations)

**`order_index` assignment** (prevents race conditions):
- Client does NOT set `order_index`. Instead, the INSERT uses a DB-level default:
  ```sql
  -- In migration: create a function for atomic order_index assignment
  CREATE OR REPLACE FUNCTION next_topic_order_index(p_board_id TEXT)
  RETURNS INTEGER AS $$
    SELECT COALESCE(MAX(order_index), 0) + 1
    FROM topic_missions WHERE board_id = p_board_id;
  $$ LANGUAGE sql;
  ```
- The `INSERT` from the client omits `order_index`; a `BEFORE INSERT` trigger calls `next_topic_order_index(NEW.board_id)` to set it atomically.
- **Topic text validation**: `CHECK (char_length(topic) BETWEEN 1 AND 200)` prevents empty or excessively long topic strings.

**Migration to `notifications` table**:
```sql
ALTER TABLE notifications ALTER COLUMN post_id DROP NOT NULL;
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'comment_on_post', 'reply_on_comment', 'reply_on_post',
    'reaction_on_comment', 'reaction_on_reply', 'like_on_post',
    'topic_presenter_assigned'
  ));
```

### Edge Function: `assign-topic-presenter`

**Location**: `supabase/functions/assign-topic-presenter/index.ts`

**Caller**: Admin app (Next.js server action or API route) using service_role key.

**Payload**:
```typescript
interface AssignPayload {
  board_id: string;
}
```

**Logic** (in order):
1. Verify service_role JWT (same pattern as `create-notification`, requires `--verify-jwt` enabled in deploy config)
2. **All DB mutations (steps 3-7) execute inside a single Postgres RPC (`advance_topic_presenter(p_board_id)`)** for atomicity:
3. Find current `assigned` entry for `board_id` → set to `completed`, set `updated_at = NOW()`
4. Find next `pending` entry ordered by `order_index ASC`
5. If none found → wrap-around: reset all `completed`/`skipped` → `pending`, re-query for first `pending` by `order_index ASC`
6. Set found entry to `assigned`, set `updated_at = NOW()`
7. Insert notification row: `type = 'topic_presenter_assigned'`, `recipient_id = user_id`, `board_id`, `post_id = NULL`, `message = buildNotificationMessage(boardTitle, topic)`
8. RPC returns `{ userId, topic, userName, wrapped: boolean }`
9. Edge function returns `{ status: 'assigned', userId, topic, wrapped }` to caller

**Extractable pure function** (`computeNextAssignment`):
- The queue state transition logic (steps 3-6) is extracted into a pure TypeScript function for unit testing: given an array of `{ id, status, order_index }` entries, returns `{ completeId: string | null, assignId: string, wrapped: boolean }`. This function is tested in Vitest (Layer 1). The Postgres RPC implements the same logic in SQL for atomicity.

### Notification Extension

**`supabase/functions/_shared/notificationMessages.ts`**:
- Add `'topic_presenter_assigned'` to `NotificationType` union
- Add case in `buildNotificationMessage`: `"[board_title]에서 이번 주 발표자로 선정되었어요! 발표 주제: '${topic}'"`
- **Parameter mapping for this type**: `actorName = boardTitle`, `contentPreview = topic`. The existing `(type, actorName, contentPreview)` signature is reused without extension. The semantic mismatch (board title in the "actor" slot) is acceptable because `buildNotificationMessage` is a message-formatting function, not a domain model — the parameter names are positional placeholders. A comment in the function documents this mapping for the `topic_presenter_assigned` case.

**`apps/web/src/notification/model/Notification.ts`**:
- Add `TOPIC_PRESENTER_ASSIGNED = 'topic_presenter_assigned'` to `NotificationType` enum
- **Make `NotificationBase.postId` optional** (`postId?: string`) — required because `topic_presenter_assigned` is a board-level notification with no associated post
- Add `TopicPresenterNotification` interface extending `NotificationBase` with `type: NotificationType.TOPIC_PRESENTER_ASSIGNED` (no `postId`, no `commentId`)
- Add to `Notification` union type
- **All existing notification interfaces are unaffected** — they already provide `postId` via `NotificationBase`, and their rendering code already accesses `postId` from the specific typed notification, not the base

**`apps/web/src/shared/api/supabaseReads.ts`**:
- **Make `NotificationDTO.postId` optional** (`postId?: string`) — the DB column is now nullable

**`apps/web/src/notification/api/notificationApi.ts`**:
- Add case for `TOPIC_PRESENTER_ASSIGNED` in `mapDTOToNotification` switch — returns `{ ...base, type: row.type }` (no postId, no commentId)
- **Update `base` object**: handle optional `postId` — use `postId: row.postId ?? ''` or conditional inclusion
- **Graceful fallback in `default` case**: Replace the `throw` on unknown type with a logged warning + return of a generic notification object. This prevents runtime crashes if the edge function is deployed before the web app (or if old cached clients encounter the new type). The `never` exhaustive check moves to a separate compile-time-only assertion.

**Notification click/routing**:
- The notification list component must route `topic_presenter_assigned` to `/board/${boardId}` (not `/board/${boardId}/post/${postId}`). Add a type check before building the navigation URL.

### Web App: `topic` Feature

```
apps/web/src/topic/
├── model/
│   └── TopicMission.ts          — type TopicMission, TopicMissionStatus
├── api/
│   └── topicMissionApi.ts       — fetchAssignedPresenter, registerTopic
├── hooks/
│   ├── useAssignedPresenter.ts  — React Query hook for current assigned presenter
│   └── useTopicRegistration.ts  — mutation hook for registration form
└── components/
    ├── TopicRegistrationPage.tsx — /board/:boardId/topic route
    └── PresenterBanner.tsx       — banner shown on BoardPage when presenter assigned
```

**Routing**: Add `<Route path="/board/:boardId/topic" element={<TopicRegistrationPage />} />` to web app router.

**`PresenterBanner`**: Reads `useAssignedPresenter(boardId)`. If `assigned` entry exists: show presenter name + topic. If current user is not registered (`topic_missions` has no entry for `auth.uid()` + `boardId`): show "발표 주제 등록하기" link to `/board/:boardId/topic`.

**`BoardPage` modification**: Import and render `<PresenterBanner boardId={boardId} />` below the board header, above the post list.

### Admin App: Topic Mission Panel

**Location**: `apps/admin/src/app/admin/boards/[boardId]/topic-missions/page.tsx`

**Data source**: Direct Supabase reads via service_role (same pattern as existing `supabase-reads.ts`). Calls `assign-topic-presenter` edge function for advancement.

**Features**:
- Table: user nickname, topic, order, status badge, action buttons (Skip, reorder Up/Down)
- "다음 발표자 지정" button → calls `assign-topic-presenter` edge function
- Wrap-around indicator: shows "이번 사이클 완료 — 다음 지정 시 초기화됩니다" when zero `pending` entries remain
- "대기열 초기화" button → resets all entries to `pending` (service_role direct update, with confirmation dialog)

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| `post_id` migration on existing `notifications` data — ALTER on production table | Migration is `DROP NOT NULL` only, no data change required; safe for zero-downtime deploy |
| Two `NotificationType` definitions drift (web enum vs. edge function union) | Add a comment in both files cross-referencing each other; enforced by exhaustive `switch` in `mapDTOToNotification` which will throw at runtime on unknown type |
| `assign-topic-presenter` edge function handles all queue state — if it fails mid-way, queue can be inconsistent | Wrap the multi-step update in a Postgres function (RPC) called from the edge function so the assignment + notification insert is atomic |
| Admin reordering `order_index` — gap or collision if two admins update simultaneously | Use a Postgres RPC for reorder that renumbers all entries for the board in one transaction |
| Registration UNIQUE constraint violation if user tries to register twice | Client validates pre-submission; DB constraint returns 409 which the API layer maps to a user-facing error |

---

## Deployment Order

1. **DB migration** — safe to deploy independently (additive table, nullable column change is backward-compatible)
2. **Edge function + Web app + Admin app** — deploy together in a single release. The web app's `mapDTOToNotification` graceful fallback (logs warning instead of throwing on unknown types) provides a safety net, but simultaneous deployment is preferred to avoid displaying raw/unformatted notifications.
3. **Rollback**: Edge function removal + drop `topic_missions` table. The `notifications.post_id` nullable change is permanent (backward-compatible, no rollback needed).

## Migration Plan

1. **DB migration** (`supabase/migrations/YYYYMMDD_add_topic_missions.sql`):
   - Create `topic_missions` table with indexes and RLS policies
   - Alter `notifications.post_id` to allow NULL
   - Update `notifications` type CHECK constraint

2. **Edge function** (`supabase/functions/assign-topic-presenter/`):
   - Implement advancement logic + notification insert
   - Deploy alongside existing `create-notification`

3. **Notification model extension**:
   - `notificationMessages.ts`: add type + message builder
   - `Notification.ts` + `notificationApi.ts`: add enum value, interface, switch case

4. **Web `topic` feature**:
   - Model, API layer, hooks, components
   - Register route in app router
   - Add `PresenterBanner` to `BoardPage`

5. **Admin topic mission page**:
   - New page under `boards/[boardId]/topic-missions/`
   - Reads via `supabase-reads.ts`, writes via edge function

6. **Rollback**: The `topic_missions` table can be dropped independently. The notifications column change (`DROP NOT NULL`) is backward-compatible — existing rows are unaffected. Edge function can be removed without impact on existing functions. The `PresenterBanner` renders nothing if no assigned presenter exists, so it is safe to deploy before the DB migration.

---

## Open Questions

1. **Skipped entries on wrap-around**: Should `skipped` entries be included in the next cycle (reset to `pending`) or permanently excluded? Current design includes them in wrap-around reset. If exclusion is desired, `skip` should be a soft-delete pattern instead.

2. **Admin reorder UX**: Up/Down buttons or drag-and-drop? Up/Down is simpler to implement correctly; drag-and-drop is better UX for long queues. Decision deferred to implementation.

3. **Banner for the assigned presenter themselves**: Should the assigned presenter see the banner differently (e.g., "당신이 다음 발표자입니다") vs. other members ("다음 발표자: OOO")? Both are reasonable; implementation should handle both cases.

---

## Testability Notes

### Layer 1 — Unit (Vitest)

**Target**: Pure logic with no external dependencies.

- `buildNotificationMessage('topic_presenter_assigned', actorName, topic)` → expected Korean string format
- `buildNotificationMessage` with topic longer than 35 chars → truncated with ellipsis (existing behavior, verified for new type)
- Queue advancement pure function (extracted from edge function): given `[{status:'assigned'}, {status:'pending'}, {status:'pending'}]` → returns correct next state (first pending becomes assigned, previous assigned becomes completed)
- Wrap-around detection: given `[{status:'assigned'}]` with no other pending entries → returns `wrapped: true`, all completed/skipped reset to pending
- Status transition validator: `pending → assigned` is valid, `pending → completed` is not

**Files**: `supabase/functions/_shared/notificationMessages.ts`, extracted queue logic module, `apps/web/src/topic/model/TopicMission.ts`

### Layer 2 — Integration (Vitest)

**Target**: Boundary contracts between layers.

- `topicMissionApi.ts` ↔ Supabase client (mocked): `registerTopic` calls correct table + columns; `fetchAssignedPresenter` queries `status = 'assigned'` for board
- `mapDTOToNotification` handles `topic_presenter_assigned` row (no `post_id`, no `comment_id`) → produces correct `TopicPresenterNotification` without throwing
- RLS boundary: board member can SELECT own board's queue (mock Supabase client verifies query includes `board_id` filter)
- `assign-topic-presenter` edge function unit: mock Supabase client, verify it calls update on previous assigned entry + insert on notifications with `post_id = null`
- `mapDTOToNotification` with `topic_presenter_assigned` row where `postId` is undefined → produces `TopicPresenterNotification` without throwing, `postId` is absent
- `mapDTOToNotification` with unknown type → logs warning and returns generic notification (graceful fallback, no throw)
- Notification click routing: `topic_presenter_assigned` notification navigates to `/board/${boardId}` (not `/board/${boardId}/post/undefined`)

**Files**: `apps/web/src/topic/api/topicMissionApi.ts`, `apps/web/src/notification/api/notificationApi.ts`, `supabase/functions/assign-topic-presenter/index.ts` (with mocked Supabase client)

### Layer 3 — E2E Network Passthrough (agent-browser + dev3000)

**State model** (derived from specs):

States: `unregistered-member`, `registered-pending`, `assigned-presenter`, `board-with-banner`, `board-without-banner`

Key transitions to cover (MBT Transition Coverage):
- `unregistered-member` → clicks banner link → `TopicRegistrationPage`
- `TopicRegistrationPage` → submits valid topic → `registered-pending` (success state)
- `TopicRegistrationPage` → submits duplicate → error state shown
- `board-without-banner` → admin assigns presenter → `board-with-banner`
- `board-with-banner` → assigned presenter views board → sees personalized banner
- `assigned-presenter` → receives notification → taps deep link → board page

Admin flow transitions to cover:
- Admin clicks "다음 발표자 지정" → member's board shows banner + member receives notification
- Admin clicks "건너뛰기" on assigned presenter → next pending member becomes assigned
- Admin clicks "대기열 초기화" → all entries reset to `pending`, no presenter assigned

**Mocking**: Only notification delivery (push) mocked at network level. Dev server (Supabase anon key) used for all DB reads.

**dev3000**: Started before E2E run; timeline referenced in `verify_report.md` for any failed transition.

### Layer 4 — E2E Local DB (Supabase local Docker)

**Target**: DB-dependent correctness only.

- **RLS**: Member from Board A cannot SELECT `topic_missions` for Board B (verify 0 rows returned, no error)
- **UNIQUE constraint**: Second `INSERT` for same `(board_id, user_id)` returns Postgres unique violation (23505); API layer surfaces user-friendly error
- **Wrap-around integrity**: After all entries are `completed`, calling advance resets all to `pending` and sets first to `assigned` in one atomic RPC call
- **Nullable `post_id`**: `INSERT INTO notifications (type='topic_presenter_assigned', post_id=NULL, ...)` succeeds after migration; existing `NOT NULL` types still reject NULL `post_id`
- **`updated_at` trigger**: Updating `topic_missions.status` updates `updated_at` automatically (if trigger added to migration)
