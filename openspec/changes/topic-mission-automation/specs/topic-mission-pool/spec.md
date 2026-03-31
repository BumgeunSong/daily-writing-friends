# Spec: topic-mission-pool

## ADDED Requirements

### Requirement: Queue Data Model

The system SHALL maintain a `topic_missions` table that stores the per-board queue of topic presentation entries. Each entry SHALL record: a unique ID, the board it belongs to (`board_id`), the registered member (`user_id`), the topic text, the position in queue (`order_index`), the current lifecycle status, and `created_at`/`updated_at` timestamps.

The table SHALL enforce:
- `board_id` references `boards(id)` with `ON DELETE CASCADE`
- `user_id` references `users(id)` with `ON DELETE CASCADE`
- `status` restricted to `('pending', 'assigned', 'completed', 'skipped')`
- `topic` length between 1 and 200 characters (`CHECK (char_length(topic) BETWEEN 1 AND 200)`)
- One queue slot per member per board: `UNIQUE(board_id, user_id)`

#### Scenario: Valid entry is stored

WHEN a board member registers a topic for a board they belong to
THEN a row is inserted into `topic_missions` with `status = 'pending'` and all required fields populated

#### Scenario: Duplicate registration is rejected

WHEN a board member attempts to register a second topic for the same board
THEN the insert fails with a unique constraint violation (Postgres error code 23505)

#### Scenario: Topic exceeding max length is rejected

WHEN a registration is attempted with a topic string longer than 200 characters
THEN the insert fails with a check constraint violation

#### Scenario: Empty topic is rejected

WHEN a registration is attempted with an empty topic string
THEN the insert fails with a check constraint violation

---

### Requirement: Server-Side Order Index Assignment

The system SHALL assign `order_index` values server-side via a `BEFORE INSERT` trigger that calls `next_topic_order_index(board_id)`. Clients SHALL NOT supply `order_index` in the insert payload.

`next_topic_order_index(p_board_id)` SHALL return `COALESCE(MAX(order_index), 0) + 1` for the given board.

#### Scenario: First registrant gets order_index 1

WHEN the first member registers a topic for a board with no existing entries
THEN the inserted row has `order_index = 1`

#### Scenario: Subsequent registrant gets next order_index

WHEN a second member registers after one entry already exists with `order_index = 1`
THEN the new row has `order_index = 2`

#### Scenario: Client-supplied order_index is ignored

WHEN a registration request includes an `order_index` value in the payload
THEN the server-assigned value from the trigger overrides it

---

### Requirement: Status Lifecycle

Each `topic_missions` entry SHALL follow the lifecycle: `pending → assigned → completed → skipped`. Valid transitions are:
- `pending → assigned` (presenter selected by admin advancement)
- `assigned → completed` (advancement: current presenter is displaced by the next)
- `pending → skipped` (admin skips a member)
- `skipped → pending` (wrap-around reset)
- `completed → pending` (wrap-around reset)
- `assigned → pending` (admin Reset Queue operation — bulk-resets all entries including the current assigned presenter)

The system SHALL NOT permit any other status transitions outside these paths.

#### Scenario: Initial status is pending

WHEN a new entry is inserted
THEN its `status` is `'pending'`

#### Scenario: Assigned entry moves to completed on next advancement

WHEN the admin advances to the next presenter and an entry currently has `status = 'assigned'`
THEN that entry's `status` is updated to `'completed'`

#### Scenario: Next pending entry becomes assigned on advancement

WHEN the admin advances and at least one `pending` entry exists
THEN the `pending` entry with the lowest `order_index` has its `status` set to `'assigned'`

---

### Requirement: Queue Advancement Atomicity

All queue state mutations during an advancement operation SHALL execute inside a single Postgres RPC (`advance_topic_presenter(p_board_id)`) to guarantee atomicity. The operation SHALL:
1. Set the current `assigned` entry to `completed`
2. Find the next `pending` entry by `order_index ASC`
3. If no `pending` entry exists, trigger wrap-around (reset all `completed` and `skipped` entries to `pending`), then re-query for the first `pending` entry
4. Set the found entry to `assigned`
5. Return `{ userId, topic, userName, wrapped: boolean }`

#### Scenario: Advancement with pending entries succeeds atomically

WHEN `advance_topic_presenter` is called with a board that has one `assigned` and multiple `pending` entries
THEN in a single transaction: the current assigned entry becomes `completed`, the lowest-order pending entry becomes `assigned`, and no other entries are affected

#### Scenario: Advancement with no pending entries triggers wrap-around

WHEN `advance_topic_presenter` is called and no `pending` entries remain (only `assigned`, `completed`, or `skipped`)
THEN all `completed` and `skipped` entries are reset to `pending`, the current `assigned` entry becomes `completed`, and the lowest-order entry (now `pending`) becomes `assigned`

#### Scenario: RPC returns wrapped flag on wrap-around

WHEN wrap-around occurs during advancement
THEN the RPC return value includes `wrapped: true`

#### Scenario: RPC returns wrapped false on normal advancement

WHEN advancement proceeds without wrap-around
THEN the RPC return value includes `wrapped: false`

---

### Requirement: Row-Level Security Policies

The `topic_missions` table SHALL enforce the following RLS policies:

- **SELECT**: Any authenticated user who is a member of the board (has a row in `user_board_permissions` matching `user_id = auth.uid()` AND `board_id`) MAY read all entries for that board.
- **INSERT**: A board member may insert only an entry where `user_id = auth.uid()`.
- **UPDATE / DELETE**: Only `service_role` may update or delete entries.

#### Scenario: Board member reads own board's queue

WHEN an authenticated user who belongs to Board A queries `topic_missions` for Board A
THEN all entries for Board A are returned

#### Scenario: Non-member cannot read another board's queue

WHEN an authenticated user who does NOT belong to Board B queries `topic_missions` for Board B
THEN zero rows are returned (RLS filter, no error)

#### Scenario: Member can insert own entry

WHEN a board member inserts a row with `user_id = auth.uid()`
THEN the insert succeeds

#### Scenario: Member cannot insert entry for another user

WHEN a board member attempts to insert a row with a different `user_id`
THEN the insert is rejected by the RLS `WITH CHECK` policy

#### Scenario: Member cannot update entries directly

WHEN a board member attempts to UPDATE a `topic_missions` row via anon/user key
THEN the operation is rejected (only service_role may update)

---

### Requirement: updated_at Auto-Update

The `topic_missions` table SHALL include a `BEFORE UPDATE` trigger that sets `updated_at = NOW()` whenever a row is modified. This ensures `updated_at` always reflects the last modification time without requiring callers to supply the value.

#### Scenario: Status update refreshes updated_at

WHEN a row's `status` is changed (e.g., from `pending` to `assigned`)
THEN `updated_at` is automatically set to the current timestamp
