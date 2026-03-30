# Spec: topic-presenter-notification

## ADDED Requirements

### Requirement: Notification Type for Presenter Assignment

The system SHALL define a new notification type `topic_presenter_assigned` in both:
- `apps/web/src/notification/model/Notification.ts` (TypeScript enum: `TOPIC_PRESENTER_ASSIGNED = 'topic_presenter_assigned'`)
- `supabase/functions/_shared/notificationMessages.ts` (string union)

Both definitions MUST be kept in sync. Each file SHALL include a comment cross-referencing the other.

#### Scenario: Enum value matches string union

WHEN the `NotificationType.TOPIC_PRESENTER_ASSIGNED` enum value is compared to the string `'topic_presenter_assigned'`
THEN they are equal

---

### Requirement: Notification Dispatch on Presenter Assignment

WHEN the admin calls the `assign-topic-presenter` edge function and a new presenter is set to `assigned`, the system SHALL insert a notification row into the `notifications` table with:
- `type = 'topic_presenter_assigned'`
- `recipient_id` = the assigned presenter's `user_id`
- `board_id` = the board's ID
- `post_id = NULL`
- `message` = the Korean-language formatted string (see Notification Message Format requirement)

The notification insert SHALL occur within the same atomic Postgres RPC as the queue state mutations.

#### Scenario: Notification row is inserted on assignment

WHEN `assign-topic-presenter` is called and a presenter is assigned
THEN a row is inserted into `notifications` with `type = 'topic_presenter_assigned'`, `recipient_id` equal to the presenter's user ID, and `post_id = NULL`

#### Scenario: No notification on wrap-around reset only

WHEN wrap-around occurs (all entries reset to `pending`) but a new presenter IS also assigned in the same operation
THEN exactly one notification is inserted for the newly assigned presenter

---

### Requirement: Notification Message Format

The notification message SHALL be formatted as:
`"[board_title]에서 이번 주 발표자로 선정되었어요! 발표 주제: '[topic]'"`

The `buildNotificationMessage` function SHALL accept `actorName = boardTitle` and `contentPreview = topic` for this type. A comment in the function SHALL document this parameter mapping for `topic_presenter_assigned`.

If the topic string exceeds 35 characters, the existing truncation behavior (append ellipsis) SHALL apply.

#### Scenario: Message contains board title and topic

WHEN `buildNotificationMessage('topic_presenter_assigned', '글쓰기 친구들', '내가 좋아하는 글쓰기 방법')` is called
THEN the returned string is `"글쓰기 친구들에서 이번 주 발표자로 선정되었어요! 발표 주제: '내가 좋아하는 글쓰기 방법'"`

#### Scenario: Long topic is truncated

WHEN `buildNotificationMessage` is called with a topic longer than 35 characters
THEN the topic in the returned message is truncated with an ellipsis

---

### Requirement: Nullable post_id for Board-Level Notification

The `notifications.post_id` column SHALL be made nullable via migration (`ALTER TABLE notifications ALTER COLUMN post_id DROP NOT NULL`). The `notifications` type CHECK constraint SHALL be updated to include `'topic_presenter_assigned'`.

The TypeScript type `NotificationDTO.postId` in `supabaseReads.ts` SHALL be updated to `postId?: string`. `NotificationBase.postId` in `Notification.ts` SHALL be updated to `postId?: string`.

#### Scenario: Nullable post_id insert succeeds after migration

WHEN a notification row is inserted with `type = 'topic_presenter_assigned'` and `post_id = NULL`
THEN the insert succeeds

#### Scenario: Existing notification types still require non-null post_id at application layer

WHEN `mapDTOToNotification` processes a notification of an existing type (e.g., `comment_on_post`)
THEN it accesses `postId` without null-safety errors (the field is present for those types)

---

### Requirement: Notification Mapping and Graceful Fallback

The `mapDTOToNotification` function SHALL include a case for `TOPIC_PRESENTER_ASSIGNED` that returns a `TopicPresenterNotification` (with `type`, `boardId`; no `postId`, no `commentId`).

The `default` branch of `mapDTOToNotification` SHALL log a warning and return a generic notification object instead of throwing. A separate compile-time-only assertion SHALL preserve exhaustiveness checking at the type level.

#### Scenario: topic_presenter_assigned is mapped correctly

WHEN `mapDTOToNotification` receives a DTO with `type = 'topic_presenter_assigned'` and `postId = undefined`
THEN it returns a `TopicPresenterNotification` without throwing

#### Scenario: Unknown notification type does not crash

WHEN `mapDTOToNotification` receives a DTO with an unrecognized type string
THEN it logs a warning and returns a generic notification object instead of throwing a runtime error

---

### Requirement: Notification Click Routing

WHEN a user taps or clicks a `topic_presenter_assigned` notification in the notification list
THEN the app navigates to `/board/${boardId}` (not `/board/${boardId}/post/${postId}`).

The notification click handler SHALL inspect the notification type before building the navigation URL and SHALL use the `boardId` field directly for this type.

#### Scenario: Clicking topic_presenter_assigned notification navigates to board

WHEN a user clicks a notification with `type = 'topic_presenter_assigned'` and `boardId = 'board-123'`
THEN navigation targets `/board/board-123`

#### Scenario: Clicking a post-level notification still navigates to post

WHEN a user clicks a notification with `type = 'comment_on_post'`
THEN navigation targets the post URL (existing behavior is unchanged)
