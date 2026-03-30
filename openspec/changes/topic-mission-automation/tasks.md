# Tasks: topic-mission-automation

## 1. Database Migration

- [x] 1.1 Create migration file `supabase/migrations/YYYYMMDD_add_topic_missions.sql`
- [x] 1.2 Add `topic_missions` table with all columns, constraints (`UNIQUE(board_id, user_id)`, status CHECK, topic length CHECK), and foreign keys
- [x] 1.3 Add indexes on `(board_id, order_index)` and `(board_id, status)`
- [x] 1.4 Add `next_topic_order_index(p_board_id)` function and `BEFORE INSERT` trigger to assign `order_index` server-side
- [x] 1.5 Add `BEFORE UPDATE` trigger to auto-update `updated_at` on status changes
- [x] 1.6 Add `advance_topic_presenter(p_board_id)` Postgres RPC function implementing wrap-around logic atomically
- [x] 1.7 Add RLS policies: SELECT for board members, INSERT for self-only, UPDATE/DELETE for service_role only
- [x] 1.8 Alter `notifications.post_id` to allow NULL; update `notifications` type CHECK constraint to include `'topic_presenter_assigned'`

## 2. Notification Model Extension

- [x] 2.1 Add `TOPIC_PRESENTER_ASSIGNED = 'topic_presenter_assigned'` to `NotificationType` enum in `apps/web/src/notification/model/Notification.ts`
- [x] 2.2 Make `NotificationBase.postId` optional (`postId?: string`) in `Notification.ts`
- [x] 2.3 Add `TopicPresenterNotification` interface extending `NotificationBase`; add it to the `Notification` union type
- [x] 2.4 Make `NotificationDTO.postId` optional in `apps/web/src/shared/api/supabaseReads.ts`
- [x] 2.5 Add `'topic_presenter_assigned'` to `NotificationType` string union in `supabase/functions/_shared/notificationMessages.ts`; add cross-reference comments in both files
- [x] 2.6 Add `buildNotificationMessage` case for `topic_presenter_assigned` with Korean message format and parameter-mapping comment
- [x] 2.7 Add `TOPIC_PRESENTER_ASSIGNED` case in `mapDTOToNotification` switch in `apps/web/src/notification/api/notificationApi.ts`; replace `throw` in `default` with logged warning + generic notification fallback
- [x] 2.8 Update notification click/routing handler to navigate to `/board/${boardId}` for `topic_presenter_assigned` type

## 3. Edge Function: assign-topic-presenter

- [x] 3.1 Create `supabase/functions/assign-topic-presenter/index.ts` with service_role JWT verification
- [x] 3.2 Implement advancement logic: call `advance_topic_presenter(board_id)` RPC, receive `{ userId, topic, userName, wrapped }`
- [x] 3.3 Return `{ status: 'assigned', userId, topic, wrapped }` response to caller
- [x] 3.4 Extract `computeNextAssignment` as a pure TypeScript function (input: entry array, output: `{ completeId, assignId, wrapped }`) for unit testing
- [x] 3.5 Add edge function to `supabase/config.toml` deploy configuration with `--verify-jwt` enabled

## 4. Web: Topic Feature

- [x] 4.1 Create `apps/web/src/topic/model/TopicMission.ts` with `TopicMission` type and `TopicMissionStatus` type
- [x] 4.2 Create `apps/web/src/topic/api/topicMissionApi.ts` with `fetchAssignedPresenter(boardId)` and `registerTopic(boardId, topic)` functions
- [x] 4.3 Create `apps/web/src/topic/hooks/useAssignedPresenter.ts` React Query hook
- [x] 4.4 Create `apps/web/src/topic/hooks/useTopicRegistration.ts` mutation hook with form validation (1–200 chars) and duplicate error handling
- [x] 4.5 Create `apps/web/src/topic/components/TopicRegistrationPage.tsx` with form, validation, duplicate-registration info state, and post-submission confirmation state
- [x] 4.6 Create `apps/web/src/topic/components/PresenterBanner.tsx` with personalized view for assigned presenter, registration link for unregistered non-presenters, and no-link view for already-registered non-presenters
- [x] 4.7 Register `/board/:boardId/topic` route in the web app router pointing to `TopicRegistrationPage`

## 5. Web: Board Page Integration

- [x] 5.1 Import and render `<PresenterBanner boardId={boardId} />` in `BoardPage` below the board header and above the post list

## 6. Admin: Topic Mission Panel

- [x] 6.1 Create `apps/admin/src/app/admin/boards/[boardId]/topic-missions/page.tsx` with queue table (nickname, topic, order, status badge, action buttons)
- [x] 6.2 Implement "다음 발표자 지정" button: call `assign-topic-presenter` edge function via service_role, refresh table on success, disable button while in-flight
- [x] 6.3 Implement "건너뛰기" (Skip) action per row: service_role update to `skipped`; if skipped entry was `assigned`, trigger advancement to next pending
- [x] 6.4 Implement Up/Down reorder buttons: call a Postgres RPC that renumbers entries atomically; disable Up on first entry, Down on last
- [x] 6.5 Implement "대기열 초기화" (Reset) button with confirmation dialog: bulk update all entries to `pending` via service_role on confirmation
- [x] 6.6 Show pool exhaustion indicator "이번 사이클 완료 — 다음 지정 시 초기화됩니다" when zero `pending` entries remain; hide when any `pending` entry exists
- [x] 6.7 Show empty state message when no `topic_missions` entries exist for the board

## Tests

### Unit

- [x] T.1 (Vitest) `buildNotificationMessage('topic_presenter_assigned', boardTitle, topic)` returns correct Korean string
- [x] T.2 (Vitest) `buildNotificationMessage` with topic > 35 chars truncates with ellipsis
- [x] T.3 (Vitest) `computeNextAssignment` with one `assigned` + multiple `pending` → correct `completeId`, `assignId`, `wrapped: false`
- [x] T.4 (Vitest) `computeNextAssignment` with one `assigned` + no `pending` → `wrapped: true`, all completed/skipped reset to pending
- [x] T.5 (Vitest) `computeNextAssignment` with only `skipped` entries → `wrapped: true`
- [x] T.6 (Vitest) Status transition validator: `pending → assigned` valid; `pending → completed` invalid

### Integration

- [x] T.7 (Vitest) `registerTopic` calls correct Supabase table and columns; omits `order_index` from payload
- [x] T.8 (Vitest) `fetchAssignedPresenter` queries `status = 'assigned'` filter for given `boardId`
- [x] T.9 (Vitest) `mapDTOToNotification` with `type = 'topic_presenter_assigned'`, `postId = undefined` → returns `TopicPresenterNotification` without throwing
- [x] T.10 (Vitest) `mapDTOToNotification` with unknown type → logs warning, returns generic notification (no throw)
- [x] T.11 (Vitest) `mapDTOToNotification` with `comment_on_post` → `postId` still accessed safely (existing behavior unchanged)
- [x] T.12 (Vitest) Notification click handler: `topic_presenter_assigned` with `boardId = 'board-123'` → navigates to `/board/board-123`
- [x] T.13 (Vitest) Notification click handler: `comment_on_post` → navigates to post URL (unchanged)
- [x] T.14 (Vitest) `assign-topic-presenter` edge function (mocked Supabase): updates previous assigned entry + inserts notification with `post_id = null`

### E2E

- [x] T.15 (agent-browser) Unregistered board member sees banner with "발표 주제 등록하기" link when a presenter is assigned
- [x] T.16 (agent-browser) Clicking banner link navigates to `/board/:boardId/topic`; member submits valid topic → success confirmation shown
- [x] T.17 (agent-browser) Already-registered member views `/board/:boardId/topic` → no form shown, info message shown
- [x] T.18 (agent-browser) Assigned presenter views board → personalized banner ("당신이 다음 발표자입니다") with their topic shown
- [x] T.19 (agent-browser) Board with no assigned presenter → banner not rendered; board layout unaffected
- [x] T.20 (agent-browser) Admin clicks "다음 발표자 지정" → queue table updates, assigned member's board shows banner
- [x] T.21 (agent-browser) Admin clicks "건너뛰기" on assigned presenter → next pending member becomes assigned, table updates
- [x] T.22 (agent-browser) Admin clicks "대기열 초기화" → confirmation dialog shown; on confirm, all entries reset to pending, no banner shown
- [x] T.23 (Supabase local) RLS: board member from Board A cannot read `topic_missions` for Board B (0 rows, no error)
- [x] T.24 (Supabase local) UNIQUE constraint: second INSERT for same `(board_id, user_id)` returns Postgres error 23505; API layer returns user-friendly error
- [x] T.25 (Supabase local) Wrap-around integrity: after all entries are `completed`, `advance_topic_presenter` resets all to `pending` and assigns first entry atomically
- [x] T.26 (Supabase local) Nullable `post_id`: INSERT into `notifications` with `type = 'topic_presenter_assigned'` and `post_id = NULL` succeeds after migration
- [x] T.27 (Supabase local) `updated_at` trigger: updating `topic_missions.status` automatically updates `updated_at`
