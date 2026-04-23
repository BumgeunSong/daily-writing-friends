# Retrospective: topic-mission-automation

**Date**: 2026-03-31
**Branch**: feat/topic-mission-automation
**PR**: https://github.com/BumgeunSong/daily-writing-friends/pull/539
**Total harness runs**: 7 (6 prior attempts + 1 final successful run)

---

## Timeline

### Phase 1 — Planning (Run 1, 00:15–00:44, ~28 min total)

**Proposal (166s)**: Concise first draft. Already captured all 5 capabilities and correctly identified the lack of pg_cron infrastructure as a constraint. No major rework needed.

**Proposal-review (172s, Opus)**: Resolved 1 critical (undefined unregistered-user journey), 5 important, and 4 minor findings before the design phase started. Turning point: the reviewer correctly caught that "round-robin" was a misnomer — the feature is really a managed queue with wrap-around — and that hardcoding Friday as the banner day was fragile.

**Design (316s)**: Sonnet with `daily-writing-friends-design` skill. Made 6 key architecture decisions including: event-driven banner, separate registration page, new `assign-topic-presenter` edge function (not reusing `create-notification`), nullable `post_id` migration, server-side `order_index` assignment, and UNIQUE constraint on `(board_id, user_id)`.

**Design-review (406s, Opus)**: The most thorough review phase. Found 1 critical + 11 important + 13 minor issues. **Critical**: `NotificationDTO.postId` and `NotificationBase.postId` were non-optional — a nullable DB column without matching type system changes would crash notification rendering. Round 2 confirmed all critical and important issues resolved. The design emerged significantly more robust.

**Specs (389s)**: 27 requirements written across 5 spec files. The status lifecycle requirement was slightly underspecified here — the `assigned → pending` transition for the Reset Queue path was missing, which surfaced as a drift during spec-alignment.

**Tasks (202s)**: 7 groups, 63 tasks. Clean breakdown with good group sizing. The `Tests` group (13 tasks covering unit, integration, and E2E) was the only group that touched multiple layers.

---

### Phase 2 — Apply (Run 1, 00:44–01:42, ~58 min)

| Group | Attempts | Time | Notes |
|-------|----------|------|-------|
| 1. Database Migration | 1 | 344s | Clean. TSC passed first try. |
| 2. Notification Model Extension | 1 | 475s | Clean. Type changes across 5 files coordinated correctly. |
| 3. Edge Function: assign-topic-presenter | 1 | 484s | Clean. `computeNextAssignment` pure function extracted as designed. |
| 4. Web: Topic Feature | **3** | 801s total | TSC passed each time but tasks were still marked unchecked. Loop inefficiency. |
| 5. Web: Board Page Integration | 1 | 140s | Trivial single-task group. |
| 6. Admin: Topic Mission Panel | 1 | 424s | Clean. |
| Tests | 1 | 825s | All 27 tests written. But test helper seeded data was misaligned. |

**Group 4 loop**: The TSC gate passed on all 3 attempts, which means the issue was not a compile error — the agent was likely marking tasks complete without fully implementing them, or the task completion check was failing for a reason the agent couldn't resolve. The third attempt (242s) eventually cleared it.

---

### Phase 3 — Verification (Runs 1–6, 01:42–11:08, ~9 hours across multiple runs)

This was the most turbulent phase of the change lifecycle.

**Run 1 verify attempts**:
- Iter 1 (160s): FAILED
- Iter 2 (1002s): Exit code 1 → **GIT ROLLBACK** to snapshot before verify. Work-in-progress changes (including test fixes) were lost.

**Runs 2–6 (09:23–11:08)**: Five subsequent harness restarts, each trying to fix verification. Run 2 also exited with code 1 and triggered another rollback (1572s wasted). Runs 3–6 progressively narrowed the issues.

**Run 7 verify (final)**:
- Iter 1 (478s): FAILED (harness continued anyway)
- Iter 2 (938s): WARNING "Verify did not pass after 2 iterations" — but the verify session wrote `verify_report.md` with PASS and 640/640 tests.

**Root cause of verification struggle**: Three test-level issues required source fixes:
1. Hardcoded user IDs in `topic-mission-helpers.ts` didn't match seeded local Supabase users
2. `afterEach` in admin spec cleaned `topic_missions` but not `notifications`, causing T.21 to fail due to idempotency conflict from T.20
3. `fullyParallel: true` in Playwright config caused `beforeAll` conflicts across test workers

Additionally, a source-level architectural finding was documented: the notification idempotency index excludes `board_id`, meaning users can only receive one `topic_presenter_assigned` notification total. Not fixed (accepted as low severity for single-board use case).

---

### Phase 3 — Closing (Run 7, 11:32–11:44)

**Spec-alignment (346s)**: Found 2 drifts from implementation:
1. `assigned → pending` transition missing from the Status Lifecycle requirement (the Reset Queue operation path wasn't anticipated when the spec was written)
2. Non-member page-load redirect not implemented — enforcement was at RLS layer on submit instead

Both were corrected in the spec files.

**Pull request (270s)**: PR #539 created. SonarCloud failure noted as pre-existing (broken `sonar-project.properties` since monorepo migration, unrelated to this change).

**Final spec-alignment (134s)**: 27/27 requirements aligned. No code changes since spec-alignment was written. Safe to merge.

---

## Wins

### Design-review depth
The Opus design-review caught things that would have caused real runtime crashes: `NotificationDTO.postId` being non-optional against a nullable DB column, missing deployment order specification (risking `never` exhaustive throw on unknown notification type), and the `order_index` race condition on concurrent registrations. Investing in an Opus review at the design phase is clearly worthwhile for changes touching existing data contracts.

### Planning phase resolved ambiguities before implementation
Every open question from the proposal — event-driven vs. day-based banner, separate page vs. modal, scheduling infrastructure — was decided before any code was written. The implementation sessions had no architectural uncertainty to resolve.

### Atomicity design held
The decision to put all queue state mutations + notification insert inside a single Postgres RPC (`advance_topic_presenter`) meant the verification phase never encountered a partial-update bug. The "dual implementation" pattern (pure TS function for testing, SQL for atomicity) was carried through correctly.

### Graceful fallback for unknown notification types
Changing `mapDTOToNotification`'s `default: never` throw to a logged warning + generic notification prevented potential crashes from deployment timing. This was a design-review finding that paid off in the E2E test phase (test T.10 explicitly verified the fallback).

### TSC gate as a cheap first-pass quality signal
All 7 apply groups passed the TypeScript compiler gate on the first or only attempt. No type errors surfaced at verification. The TSC gate caught nothing here (good), which validates the type system changes in Group 2 were done correctly.

---

## Misses

### 1. Verify session using exit code 1 → rollback losing work
**Category**: Tool Gap / Loop Inefficiency

The harness treats any non-zero exit from a verify session as a rollback trigger. The verify session apparently exits 1 in some error condition (unclear whether Claude Code itself exits 1 or the test runner does). A rollback from `verify-iter2` snapshot loses all changes the verify session made — including test fixes. This happened twice across two runs, causing ~2.5 hours of replayed work.

The verify session should write a PASS/FAIL report to a file and always exit 0 (unless it completely crashes). The harness should read the report to determine pass/fail, not use the exit code.

### 2. Test helper seeded data not aligned to local Supabase users
**Category**: Knowledge Gap / Session Handoff Gap

The Tests apply session wrote `REGULAR_USER_ID` and `SECOND_USER_ID` hardcoded to UUIDs that didn't match the project's actual seeded local Supabase users. This was caught only during verification. The apply session had no access to the actual seeded UUIDs (they live in a local Supabase instance, not in the codebase), but this should be a known project convention.

**Fix**: Document the seeded test user UUIDs in the project's AGENTS.md or a test fixtures file that apply sessions can read.

### 3. Parallel Playwright tests conflicting in beforeAll
**Category**: Agent Gap

The Tests session wrote E2E tests without auditing the project's `playwright.config.ts` for `fullyParallel: true`. Adding `test.describe.configure({ mode: 'serial' })` is a small fix, but it required a verification loop to discover. A more careful implementation agent would read the Playwright config before writing test suites that share setup state.

### 4. Group 4 (Web: Topic Feature) needed 3 apply attempts
**Category**: Loop Inefficiency

All 3 attempts passed the TSC gate, yet tasks remained unchecked after attempts 1 and 2. The TSC gate is necessary but not sufficient — it can't detect that an agent stopped short of completing all tasks. The second and third attempts combined for ~635s of replayed work for a group that eventually took 166s on the third pass.

**Likely cause**: The group had 7 tasks and a large skill injection (7 skills). The agent may have been context-budget-constrained on the early attempts and stopped before checking off all tasks. Group 4 is also the most UI-rich group, suggesting implementation work was heavier than adjacent groups.

### 5. Notification idempotency index missing board_id
**Category**: Review Gap

The `idx_notifications_idempotency` index on notifications uses `(recipient_id, type, COALESCE(post_id,''), ...)` but does not include `board_id`. For `topic_presenter_assigned` with `post_id = NULL`, the effective key is `(recipient_id, 'topic_presenter_assigned', '', '', '', recipient_id)`. This means a user can only receive one such notification total, across all boards. The design and design-review did not surface this — it was found by the verify session as a side effect of the E2E admin spec tests interfering with each other.

**Category**: this is a real design defect, accepted as low severity only because users currently belong to one board. It will become a bug the moment multi-board membership is common.

### 6. Two spec drifts from implementation
**Category**: Process Gap

The Status Lifecycle requirement omitted the `assigned → pending` transition (Reset Queue path) — because the lifecycle was written before the Reset Queue admin operation was fully specified. The Non-Member Access requirement said "redirect on page load" but no board loader was added to the topic route.

Both drifts are minor and were corrected, but they indicate the spec writer (specs session) didn't deeply cross-reference the task list for edge-case state transitions.

### 7. Recurring `fatal: pathspec 'src/' did not match any files` in git safety commits
**Category**: Tool Gap

Every single harness session produces this error. The git safety commit script tries to stage `src/` but the monorepo has no root `src/` directory. This is purely cosmetic noise (the safety commit still succeeds), but it pollutes every log and could mask real errors.

---

## Improvement Ideas

**Verify exit code contract**: Verify sessions should always exit 0 and communicate pass/fail via a structured file (e.g., `verify_report.md` with a `verdict: PASS/FAIL` field). The harness reads the file, not the exit code. Reserve exit 1 for unrecoverable session crashes only.

**Seeded test data registry**: Add a `tests/fixtures/seeded-users.ts` (or equivalent) that documents the local Supabase seeded user UUIDs, and instruct apply sessions to reference it when writing E2E test helpers. This eliminates the "hardcoded wrong UUID" class of test-fix bugs.

**Group size cap**: Groups with 7+ tasks and 6+ skill injections are at risk of context-budget truncation. Consider splitting groups that combine model types (API + UI) into smaller ones. Group 4 could have been "Web: Topic API + Hooks" and "Web: Topic Components" to reduce per-session scope.

**Playwright config awareness in test session**: The testing skill or the apply prompt for the Tests group should instruct the agent to read `playwright.config.ts` before writing E2E test files, specifically to check `fullyParallel` and `webServer` configuration. This would have caught the serial mode gap before verify.

**Design-to-spec cross-reference pass**: After specs are written, add a quick pass that checks each spec's state lifecycle / admin operation against the full task list. The `assigned → pending` drift would have been caught here.

**Rollback communication**: When the harness performs a GIT ROLLBACK, the next session should receive explicit context about what was rolled back and why, so it doesn't re-create the same errors. Currently the session sees the pre-rollback state with no explanation.

**Fix the `src/` safety commit path**: The harness git safety script should use `git add -A` or the correct monorepo source paths instead of `src/`.

---

## Harness Observations

### Did fresh sessions resume effectively from file state?

**Mostly yes**. The planning → apply pipeline worked well: each apply session read `tasks.md`, `design.md`, and `handoff.md` and produced correct implementations without needing conversation memory from prior sessions. The handoff files (`handoff.md`) were updated after each group and were a reliable continuity mechanism.

The notable exception was the seeded user UUID issue — that knowledge lived in a running Supabase Docker container, not in any file the session could read. File-based state can't capture runtime environment state.

### Were task groups the right size?

Groups 1–3 and 5 were well-sized (1–8 tasks, focused on one technology layer). Groups 4 and 6 were at the upper edge (7 tasks, multi-file UI work) — Group 4's 3-attempt loop suggests these were slightly too large or too skill-injection-heavy. The Tests group (13 tasks, 4 layers) was large but completed in one attempt because the agent had a clear structure to follow from `tasks.md`.

### Did any phase need conversation memory that files couldn't provide?

**The verify phase** needed context from the running test environment (Playwright config `fullyParallel`, local Supabase seeded state, notification idempotency behavior under test concurrency). All three test fixes required knowledge that wasn't derivable from source files. This is a fundamental limit of file-based handoff for test-heavy verification.

**Design-review Round 2** would have benefited from seeing the Round 1 review conversation to understand why specific decisions were made. The design-review.md captured the resolution status, but not the reasoning chain. When a future session needs to understand why `mapDTOToNotification` has a graceful fallback, the artifact is sufficient — but when debugging behavior interoperability (why the old `create-notification` function couldn't be reused), the design constraint section needed to be explicit.

### What would improve cross-session continuity?

1. **Structured handoff schema**: `handoff.md` was free-form. A structured schema (what was done, what failed, what the next session needs to know, what environment state to verify) would reduce information loss at session boundaries.

2. **Environment preconditions in handoff**: Before verify, the handoff should explicitly document: local Supabase status, seeded user IDs used in tests, any Playwright config choices (serial vs parallel) and why. The verify session then reads these as setup preconditions.

3. **Verify session as a loop, not a gate**: Instead of verify → rollback → restart, consider a verify session that runs tests, diagnoses failures, applies fixes, re-runs, and writes a report — all within one session. The current 2-iteration limit forces cross-session fix cycles that lose context.

4. **Explicit "what the rollback lost" note**: When a rollback occurs, the harness should commit a note to `handoff.md` describing what was rolled back. This prevents the next session from confidently re-implementing the same broken approach.

5. **Artifact existence check should verify content quality**: The planning phase skip logic checks that `design.md` exists, but not whether it's complete. If a session partially writes `design.md` and the harness creates a safety commit, the next run will skip design — even if the file is incomplete. A checksum or "design_complete: true" sentinel would help.
