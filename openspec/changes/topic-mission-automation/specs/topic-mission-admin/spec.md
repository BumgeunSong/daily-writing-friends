# Spec: topic-mission-admin

## ADDED Requirements

### Requirement: Admin Topic Mission Panel Page

The system SHALL provide an admin panel page at `apps/admin/src/app/admin/boards/[boardId]/topic-missions/page.tsx`. The page SHALL be accessible only via the admin app (service_role access). It SHALL display the full `topic_missions` queue for the specified board in a table with columns: member nickname, topic, order index, status badge, and action buttons.

#### Scenario: Admin views queue for a board

WHEN an admin navigates to the topic-missions page for a board
THEN a table is displayed listing all `topic_missions` entries for that board, ordered by `order_index`

#### Scenario: Empty queue shows appropriate state

WHEN no `topic_missions` entries exist for the board
THEN the page displays an empty state message rather than an empty table

---

### Requirement: Advance to Next Presenter

The admin panel SHALL provide a "다음 발표자 지정" button. When clicked, it SHALL call the `assign-topic-presenter` edge function with the board's ID using the service_role key. On success, the queue table SHALL refresh to reflect the new assigned presenter.

#### Scenario: Advancing assigns the next pending member

WHEN the admin clicks "다음 발표자 지정" and at least one `pending` entry exists
THEN the current `assigned` entry becomes `completed`, the lowest-order `pending` entry becomes `assigned`, and the table updates to reflect this

#### Scenario: Advancing with no pending entries triggers wrap-around

WHEN the admin clicks "다음 발표자 지정" and no `pending` entries remain
THEN wrap-around occurs (all `completed`/`skipped` reset to `pending`), a new presenter is assigned, and the table updates to reflect this

#### Scenario: Advance button is disabled or shows feedback while in-flight

WHEN the admin clicks "다음 발표자 지정" and the request is in progress
THEN the button is disabled or shows a loading indicator to prevent duplicate submissions

---

### Requirement: Skip Member

The admin panel SHALL provide a "건너뛰기" (Skip) action button for each queue entry. Clicking it SHALL update the entry's `status` from `pending` (or `assigned`) to `skipped` via service_role. If the skipped entry was `assigned`, the system SHALL automatically advance to the next `pending` entry.

#### Scenario: Admin skips a pending member

WHEN the admin clicks "건너뛰기" on a `pending` entry
THEN that entry's `status` changes to `'skipped'` and the table reflects the change

#### Scenario: Admin skips the currently assigned presenter

WHEN the admin clicks "건너뛰기" on the currently `assigned` entry
THEN that entry becomes `skipped` and the next `pending` entry (by `order_index`) becomes `assigned`

---

### Requirement: Reorder Queue Entries

The admin panel SHALL provide Up and Down action buttons for each queue entry to adjust `order_index`. Reordering SHALL execute via a Postgres RPC that, in a single transaction, swaps the selected entry's `order_index` with that of the adjacent entry above or below it to prevent gaps or collisions.

#### Scenario: Moving an entry up decreases its order_index

WHEN the admin clicks the Up button on an entry that is not already first
THEN that entry swaps position with the entry above it, and the table reflects the new order

#### Scenario: Moving an entry down increases its order_index

WHEN the admin clicks the Down button on an entry that is not already last
THEN that entry swaps position with the entry below it, and the table reflects the new order

#### Scenario: First entry cannot move up

WHEN the admin views an entry with the lowest `order_index`
THEN the Up button is disabled or absent

#### Scenario: Last entry cannot move down

WHEN the admin views an entry with the highest `order_index`
THEN the Down button is disabled or absent

---

### Requirement: Reset Queue

The admin panel SHALL provide a "대기열 초기화" (Reset Queue) button. Clicking it SHALL display a confirmation dialog before proceeding. On confirmation, all `topic_missions` entries for the board SHALL be reset to `status = 'pending'` via a service_role bulk update. No entry is deleted; `order_index` values are preserved.

#### Scenario: Reset shows confirmation dialog

WHEN the admin clicks "대기열 초기화"
THEN a confirmation dialog is displayed before any changes are made

#### Scenario: Confirmed reset resets all entries to pending

WHEN the admin confirms the reset
THEN all `topic_missions` entries for the board have `status = 'pending'`
AND the table updates to reflect this (no assigned presenter)

#### Scenario: Cancelled reset makes no changes

WHEN the admin dismisses the confirmation dialog without confirming
THEN no entries are modified

---

### Requirement: Pool Exhaustion Indicator

The admin panel SHALL display a wrap-around indicator when zero `pending` entries remain for the board (i.e., all entries are `completed` or `skipped`). The indicator SHALL communicate that clicking "다음 발표자 지정" will trigger a wrap-around (queue cycle reset).

#### Scenario: Indicator shown when no pending entries remain

WHEN all `topic_missions` entries for the board have `status` of `'completed'` or `'skipped'`
THEN the admin panel displays the message "이번 사이클 완료 — 다음 지정 시 초기화됩니다"

#### Scenario: Indicator hidden when pending entries exist

WHEN at least one `topic_missions` entry for the board has `status = 'pending'`
THEN the pool exhaustion indicator is not shown
