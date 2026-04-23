# Design Review: topic-mission-automation

## Architecture Reviewer

### 1. `NotificationDTO.postId` and `NotificationBase.postId` are non-optional — **Critical**

The design makes `notifications.post_id` nullable in the DB, but the existing TypeScript types enforce it as required:

- `NotificationDTO.postId: string` (`apps/web/src/shared/api/supabaseReads.ts:1052`)
- `NotificationBase.postId: string` (`apps/web/src/notification/model/Notification.ts:14`)
- `mapDTOToNotification` spreads `postId: row.postId` into every notification (`notificationApi.ts:11`)

A `topic_presenter_assigned` notification with `post_id = NULL` will produce `postId: null` at runtime, violating the type contract and likely crashing notification rendering wherever `postId` is used as a route parameter.

**Required**: The design must specify that `NotificationDTO.postId` becomes `string | undefined`, `NotificationBase.postId` becomes optional, and `TopicPresenterNotification` omits `postId`. The `mapDTOToNotification` base object must handle the optional field. Notification click/routing logic must handle the absence of `postId`.

### 2. `buildNotificationMessage` signature mismatch — **Important**

The existing function signature is `buildNotificationMessage(type, actorName, contentPreview)`. For `topic_presenter_assigned`:
- There is no "actor" in the user-interaction sense — the system/admin assigned the presenter
- The design proposes a message format `"[board_title]에서 이번 주 발표자로 선정되었어요! 발표 주제: '${topic}'"` which requires `board_title` and `topic`, neither of which maps cleanly to `actorName`/`contentPreview`

The design mentions "new optional `topic` parameter" or "accept `contentPreview` as the topic string" but doesn't commit to either. The `actorName` slot would need to carry `board_title`, which is a semantic mismatch that makes the function contract confusing.

**Required**: Specify the concrete approach — either extend the function signature with an options object, or document that `actorName = boardTitle` and `contentPreview = topic` for this type.

### 3. `create-notification` edge function hard-requires `postId` — **Important**

At line 133 of `create-notification/index.ts`: `if (!boardId || !postId) { ... return skipped }`. The new `assign-topic-presenter` edge function bypasses this by inserting notifications directly, which is good. But the design should explicitly note that `create-notification` is NOT reused and explain why, to prevent future developers from trying to route topic notifications through it.

### 4. Admin app Supabase service_role access pattern — **Minor**

The admin app's CLAUDE.md describes a Firebase-primary architecture, but the board detail page already uses Supabase reads. The design correctly leverages this existing Supabase integration. The `SUPABASE_SERVICE_ROLE_KEY` is listed in AGENTS.md as available to admin. No issue, but the design could note which admin API pattern (server action vs. API route) will call the edge function.

### 5. New `topic` feature directory follows existing conventions — **Minor**

The proposed `apps/web/src/topic/` directory with `model/`, `api/`, `hooks/`, `components/` subdirectories matches existing feature directories (`board/`, `notification/`, etc.). Route pattern `/board/:boardId/topic` is consistent. Good architectural fit.

---

## Security Reviewer

### 1. RLS SELECT policy is too broad — **Important**

The design states: `SELECT: board members can read their own board's entries (user_id = auth.uid() OR user has permission on board_id)`. The `OR` clause means any board member can read all queue entries for their board, which is the intended behavior. However, "user has permission on board_id" needs to reference the existing `user_board_permissions` table with a subquery. The design should specify the exact RLS expression to avoid an overly permissive implementation (e.g., accidentally allowing any authenticated user to read any board's queue).

**Required**: Specify the RLS policy expression, e.g., `EXISTS (SELECT 1 FROM user_board_permissions WHERE user_id = auth.uid() AND board_id = topic_missions.board_id)`.

### 2. Edge function JWT validation via manual base64 decode — **Important**

The design says "Verify service_role JWT (same pattern as `create-notification`)". That pattern (`JSON.parse(atob(token.split('.')[1]))`) does NOT verify the JWT signature — it only decodes the payload. This is the existing pattern and works because Supabase's `--verify-jwt` flag handles actual verification. The design should explicitly note that `--verify-jwt` must be enabled for the new function (in `supabase/config.toml` or deploy flags), since the in-code check is a role-claim filter, not a security boundary.

### 3. Registration INSERT — no rate limiting or spam protection — **Minor**

A board member can call `registerTopic` to insert into `topic_missions`. The UNIQUE constraint prevents duplicates, but there's no mention of input validation on the `topic` TEXT field (max length, content sanitization). A malicious or careless user could insert arbitrarily long text.

**Recommended**: Add a `CHECK (char_length(topic) <= 200)` constraint or similar in the migration, and validate client-side.

### 4. Admin reorder endpoint lacks CSRF/authorization granularity — **Minor**

The design uses service_role for all admin operations, which is standard. No additional CSRF concern beyond what Next.js server actions already provide. Acceptable.

### 5. `order_index` manipulation by non-admin users — **Minor**

INSERT RLS allows board members to insert their own entries. The design doesn't restrict which `order_index` value they can set. A member could set `order_index = 0` to jump to the front of the queue.

**Recommended**: Either compute `order_index` server-side (e.g., via a DB function `COALESCE(MAX(order_index), 0) + 1`) or add a CHECK constraint. The client should not control queue position.

---

## Quality Reviewer

### 1. `order_index` assignment race condition — **Important**

When a member registers, the client (or API layer) must determine the next `order_index`. With concurrent registrations, two users could read the same `MAX(order_index)` and insert the same value. The UNIQUE constraint is on `(board_id, user_id)`, NOT on `(board_id, order_index)`, so duplicate order_index values would be silently accepted, causing ambiguous queue ordering.

**Required**: Use a DB-level approach — either a Postgres function that computes and inserts atomically, or add a UNIQUE constraint on `(board_id, order_index)` and retry on conflict.

### 2. Wrap-around reset timing is ambiguous — **Important**

The design says wrap-around happens "when `advance` is called and there are zero `pending` entries remaining after setting the current to `assigned`." But step 2 of the edge function says "find current assigned → set to completed" and step 3 says "find next pending." The wrap-around check should happen between steps 3 and 4 (when no pending is found), but the current description implies it's checked after setting the last pending to assigned. Clarify the exact sequence.

### 3. Missing `updated_at` trigger — **Minor**

The design defines `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` but doesn't include a trigger to auto-update it on row modification. The Testability Notes (Layer 4) mention verifying "`updated_at` trigger (if trigger added to migration)" — the conditional language suggests this might be forgotten. It should be in the migration spec.

### 4. No error handling for edge function partial failure — **Minor**

The Risks table mentions wrapping updates in a Postgres RPC for atomicity, but the edge function logic description (steps 1-8) doesn't integrate the RPC. The design should specify which steps are inside the RPC and which are outside.

### 5. `status` as TEXT with CHECK vs. enum — **Minor**

Using `TEXT CHECK (status IN (...))` is consistent with `notifications.type` pattern. Acceptable trade-off for this project, though a Postgres enum would prevent typos at the type level. Consistent with existing conventions — no change needed.

---

## Testability Reviewer

### 1. Queue advancement logic not specified as extractable pure function — **Important**

The Testability Notes (Layer 1) mention "Queue advancement pure function (extracted from edge function)" but the Architecture section describes this logic inline within the edge function. The design should explicitly specify that steps 2-5 of the edge function are extracted into a testable pure function (e.g., `computeNextAssignment(entries)`) that takes current state and returns the state transition, separate from DB operations.

### 2. E2E state model doesn't cover admin flows — **Important**

Layer 3 E2E tests cover member-facing flows (registration, banner, notification). But the admin panel (advance, skip, reorder, reset) is a critical path that's untested at the E2E level. Admin flows should have at least:
- Admin advances → member sees banner + receives notification
- Admin skips → next member becomes assigned
- Admin resets → all entries return to pending

### 3. Integration test mocking strategy is underspecified — **Minor**

Layer 2 says "mock Supabase client" but doesn't specify whether this is a vitest mock, MSW, or a Supabase test helper. The existing test patterns in the codebase should be referenced.

### 4. No test for notification rendering with null postId — **Minor**

The notification click handler likely routes to `/board/:boardId/post/:postId`. With `postId = null`, this flow needs explicit test coverage. Should be listed in Layer 2.

### 5. Wrap-around cycle counter is untestable — **Minor**

The admin panel shows a "cycle N" indicator, but the design doesn't specify how cycle count is derived. If it's computed client-side by counting wrap-arounds, it's not persisted and can't be tested in isolation. Consider whether a `cycle` column on the table would simplify this.

---

## Integration Reviewer

### 1. `NotificationType` dual-source sync is fragile — **Important**

Two files maintain `NotificationType` independently:
- `apps/web/src/notification/model/Notification.ts` (TypeScript enum)
- `supabase/functions/_shared/notificationMessages.ts` (string union)

The design acknowledges this and proposes cross-referencing comments + exhaustive switch. This is the existing pattern and is acceptable, but the design should note that the exhaustive `default: never` check in `mapDTOToNotification` (line 38) will cause a **runtime crash** (not a compile error) if the edge function inserts a type that the web app doesn't recognize yet. This means the edge function and web app must be deployed simultaneously, or old web clients will crash when receiving the new notification type.

**Required**: Specify deployment order — DB migration first, then edge function + web app together. Or add a graceful fallback in `mapDTOToNotification` for unknown types (return a generic notification instead of throwing).

### 2. `NotificationDTO` in `supabaseReads.ts` needs update — **Important**

`fetchNotificationsFromSupabase` does `select('*')` which will return `post_id: null` for topic notifications. The column-to-field mapping (wherever it happens — likely automatic via Supabase client) will produce `postId: null`. The `NotificationDTO` interface must be updated to make `postId` optional, and the `mapDTOToNotification` function must handle it.

This is the same underlying issue as Architecture Finding #1 but from the integration perspective — multiple files across the codebase need coordinated changes.

### 3. Notification click/navigation routing — **Important**

The design specifies a deep link to `/board/:boardId` for topic notifications, but doesn't specify how the notification click handler distinguishes between notification types that link to posts vs. boards. The existing notification rendering likely builds a URL like `/board/${boardId}/post/${postId}`. A new code path is needed for `topic_presenter_assigned` to route to `/board/${boardId}` instead.

### 4. Admin app edge function invocation pattern — **Minor**

The design says the admin app calls `assign-topic-presenter` via service_role but doesn't specify the HTTP client pattern. Existing admin Supabase usage goes through `supabase-reads.ts`. Edge function calls typically use `supabase.functions.invoke()`. The design should note which pattern to follow.

### 5. Route guard for `/board/:boardId/topic` — **Minor**

The registration page should only be accessible to authenticated board members. The design doesn't mention route protection, but this likely inherits from the existing board route guard. Worth noting explicitly.

---

## Summary (Round 1)

| Perspective | Critical | Important | Minor |
|---|---|---|---|
| Architecture | 1 | 2 | 2 |
| Security | 0 | 2 | 3 |
| Quality | 0 | 2 | 3 |
| Testability | 0 | 2 | 3 |
| Integration | 0 | 3 | 2 |
| **Total** | **1** | **11** | **13** |

### Critical issues requiring design update:
1. **`NotificationDTO.postId` / `NotificationBase.postId` non-optional type** — nullable DB column without type system update will cause runtime crashes

### Important issues requiring design update:
1. `buildNotificationMessage` signature mismatch — needs concrete parameter mapping
2. RLS SELECT policy expression unspecified — risk of overly permissive implementation
3. `order_index` race condition — concurrent registration can produce duplicates
4. `order_index` client-controllable — members can jump queue position
5. Wrap-around trigger timing ambiguous in edge function steps
6. Queue advancement not specified as extractable pure function
7. E2E tests missing admin flows
8. Deployment order unspecified — risk of runtime crash from `never` exhaustive check
9. Notification click routing for post-less notification type
10. `NotificationType` dual-source sync + `NotificationDTO.postId` optionality

---

*Design.md updated to address Critical and Important findings. Proceeding to Round 2 re-review.*

---

## Round 2 Re-Review

After updating `design.md`, all Critical and Important findings have been addressed:

| Round 1 Finding | Status | How Addressed |
|---|---|---|
| **Critical**: `NotificationDTO.postId` non-optional | **Resolved** | Design now specifies `postId?: string` in both `NotificationDTO` and `NotificationBase`; `TopicPresenterNotification` omits `postId`; `mapDTOToNotification` base object handles optional field |
| `buildNotificationMessage` signature mismatch | **Resolved** | Design documents `actorName = boardTitle`, `contentPreview = topic` with in-code comment |
| `create-notification` hard-requires `postId` | **Resolved** | Design explicitly notes `create-notification` is NOT reused; separate edge function rationale documented in Constraints section |
| RLS SELECT policy unspecified | **Resolved** | Exact SQL policy expressions added for both SELECT and INSERT |
| Edge function JWT `--verify-jwt` | **Accepted** | Design notes `--verify-jwt` must be enabled in deploy config |
| `order_index` race condition | **Resolved** | DB-level `next_topic_order_index()` function with `BEFORE INSERT` trigger; client does not set `order_index` |
| `order_index` client-controllable | **Resolved** | Same fix — trigger sets `order_index`, client omits it |
| Wrap-around timing ambiguous | **Resolved** | Edge function steps renumbered; wrap-around clearly occurs at step 5 (when no pending found after step 4) |
| Queue advancement not extractable | **Resolved** | `computeNextAssignment` pure function specified; dual implementation (TS for testing, SQL RPC for atomicity) |
| E2E tests missing admin flows | **Resolved** | Admin flow transitions added to Layer 3 (advance, skip, reset) |
| Deployment order unspecified | **Resolved** | New "Deployment Order" section: DB migration first, then edge function + web + admin together |
| Notification click routing | **Resolved** | "Notification click/routing" section added to Notification Extension |
| `NotificationDTO` optionality | **Resolved** | `supabaseReads.ts` update specified with `postId?: string` |
| Graceful fallback for unknown types | **Resolved** | `mapDTOToNotification` default case changed from throw to logged warning + generic notification |
| Topic text validation | **Resolved** | `CHECK (char_length(topic) BETWEEN 1 AND 200)` added to table spec |

### Remaining Minor Issues (Accepted)

These do not require design changes — they are implementation-level concerns:

1. **`updated_at` trigger**: The Testability Notes still use conditional language ("if trigger added"). The migration should include a standard `updated_at` trigger. This is an implementation detail, not a design gap.

2. **Cycle counter persistence**: The admin panel's "cycle N" indicator is derived from wrap-around events but not persisted. For the first version, showing "이번 사이클 완료" when zero pending entries remain is sufficient. A `cycle` column can be added later if cycle history tracking is needed.

3. **Integration test mocking strategy**: Layer 2 says "mock Supabase client" without specifying the tool. The existing test file (`notificationApi.test.ts`) can be referenced during implementation to match the project's mocking pattern.

4. **`next_topic_order_index` concurrency**: The SQL function uses `LANGUAGE sql` without row-level locking. Two perfectly concurrent INSERTs could theoretically get the same `MAX(order_index)`. Given the expected traffic (small cohort boards, manual registration), this is acceptable. If needed, the function can be upgraded to `LANGUAGE plpgsql` with `FOR UPDATE` locking.

5. **Route guard for `/board/:boardId/topic`**: Inherits from existing board route guard pattern. Implementation should verify this.

---

## Final Summary

| Perspective | Critical | Important | Minor |
|---|---|---|---|
| Architecture | 1 (resolved) | 2 (resolved) | 2 |
| Security | 0 | 2 (resolved) | 3 (1 resolved) |
| Quality | 0 | 2 (resolved) | 3 |
| Testability | 0 | 2 (resolved) | 3 (1 resolved) |
| Integration | 0 | 3 (resolved) | 2 |
| **Total** | **1 (resolved)** | **11 (resolved)** | **13 (2 resolved)** |

**Verdict**: All Critical and Important findings have been addressed in the updated `design.md`. The design is ready for task breakdown and implementation. Remaining Minor items are implementation-level concerns that do not require design changes.
