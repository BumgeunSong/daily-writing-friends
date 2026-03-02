# Retrospective: stats-supabase-migration

**Date**: 2026-03-02
**Run ID**: 20260302-222208
**Total wall time**: ~51 minutes (22:22:08 – 23:12:52)
**PR**: https://github.com/BumgeunSong/daily-writing-friends/pull/502
**Outcome**: PR merged, all CI checks passing (562/562 tests, SonarCloud quality gate, 100% coverage on new code)

---

## Timeline

| Session | Start | Duration | Notes |
|---------|-------|----------|-------|
| proposal | 22:22:09 | 234s | Left `.openspec.yaml` uncommitted — harness safety-committed |
| proposal-review | 22:26:03 | 279s | 1 Critical + 3 Important findings; all fixed in proposal |
| design | 22:30:42 | 225s | Clean output; committed by agent |
| design-review | 22:34:27 | 552s | Longest planning session; 5 Important findings fixed |
| specs | 22:43:39 | 124s | Two spec files generated quickly |
| tasks | 22:45:44 | 194s | 4 groups, 30 tasks generated |
| apply-group-1 | 22:48:58 | 200s | Only Group 1 applied (tasks 1.1–1.4) |
| verify (iter 1) | 22:52:18 | 476s | Found 13 test failures; agent implemented Group 2 inline |
| spec-alignment | 23:00:15 | 189s | Generated alignment report; `run.sh` left dirty |
| pull-request | 23:03:25 | 392s | PR created; waited for CI results |
| final-spec-alignment | 23:09:57 | 175s | No drift found |

### Phase 1 — Planning (22:22 – 22:49, ~27 min)

The harness ran six sequential planning sessions. **Proposal** identified the core problem cleanly: Supabase data was already flowing in, but `Timestamp` wrapper functions added a meaningless `Date → Timestamp → Date` round-trip. The brief mentioned "stats API 중심으로 시작" and the agent correctly scoped accordingly.

**Proposal review** caught a Critical gap the proposal missed: no audit step for `.toDate()` call sites before changing model types. This was the right catch — those runtime `TypeError` failures would have been invisible until production. Three Important findings addressed the holidays bundling risk, the `supabaseReads.ts` non-stats caller concern, and the unclear schema-vs-precondition status for the holidays table.

**Design** produced a well-structured five-step migration plan. The turning point came in **design review** (9 minutes, the longest planning session), which caught a behavioral regression: the holidays Supabase query used exact date filters that would have silently dropped early-year holidays. The fix — using year-boundary expansion (`YYYY-01-01` / `YYYY-12-31`) — preserved the existing Firestore behavior. Design review also identified the RLS policy gap, silent error suppression, and tautological integration tests.

**Specs** and **tasks** ran quickly and cleanly. Tasks generated 4 groups and 30 checklist items.

### Phase 2 — Apply (22:49 – 22:52, ~4 min)

The harness ran only one apply group: Group 1 (Fix Consumer Call Sites, tasks 1.1–1.4). It then moved immediately to Phase 3 without applying Groups 2 or 3. Group 1 was mechanical — three `.toDate()` → `.createdAt` replacements and a type-check run. It completed in 200 seconds.

Groups 2 (model type changes, wrapper removal, test fixture updates) and 3 (holidays migration, conditional) were not applied before verification.

### Phase 3 — Verification & Closing (22:52 – 23:13, ~20 min)

**Verify** opened to 13 test failures — the predictable consequence of Group 1 removing `.toDate()` calls while models still declared `createdAt: Timestamp`. The verify agent diagnosed the root cause correctly and implemented Group 2 inline (tasks 2.1–2.10) rather than returning to the apply loop. All 562 tests passed after the fix. The agent also added the KST-boundary test (T.3) specified in the design. The verify session left `run.sh` modified but unstaged; the harness safety commit check flagged it but couldn't stage a modified untracked file.

**Spec alignment**, **pull request**, and **final spec alignment** ran without surprises. The PR received only automated review (coverage bot, SonarCloud) — no human feedback.

---

## Wins

**The review phases prevented real bugs.** Proposal review caught the missing `.toDate()` audit step before any code was written — a runtime `TypeError` that would have been hard to trace in production. Design review caught the holidays query regression (silent data loss) and the RLS gap. These findings shaped the implementation correctly from the start rather than surfacing during a fix loop.

**The holidays gate held.** The conditional gate for Group 3 was consistently enforced across every phase — proposal, design, tasks, verify, spec-alignment, and final-spec-alignment all kept the holidays migration deferred. The change shipped without that dependency blocking it.

**TypeScript as a compile-time safety net worked exactly as designed.** The sequence (fix callers → change models → remove wrappers → update tests) meant each step produced a compile-clean codebase. The type-check runs at tasks 1.4, 2.4, and 2.9 gave the verify agent immediate feedback at each step.

**Spec alignment provided honest tracking.** The final report clearly distinguished 15 fully-aligned requirements from 11 intentionally-missing requirements. "Missing but intentional" is not a failure state — it is correctly recorded future work.

**Total time was short.** Fifty-one minutes from blank folder to PR with CI passing, for a refactor touching 7 source files and 2 test files.

---

## Misses

### Loop Inefficiency — Apply loop stopped after one group

The apply loop ran Group 1 only, then handed off to verify with 26 tasks still unchecked. The verify session then implemented Group 2 as a side effect of diagnosing the test failures. This worked accidentally — the verify agent was capable enough to implement and verify in the same session — but it inverted the intended workflow. Verification should confirm completed work, not complete it.

**Consequence**: The verify session ran for 476 seconds, longer than any other session, partly because it was doing double duty.

### Process Gap — No apply run between Group 1 and verify

The harness went from one apply group directly to verification without applying Group 2. The root cause appears to be harness logic: after Group 1 completed, the harness declared Phase 2 done and moved to Phase 3 instead of continuing to Group 2. A mid-run harness fix (`094f3d19 fix(harness): add skip_checkpoint param`) was committed during the run, suggesting the apply-loop logic had a known defect being repaired in real time.

### Session Handoff Gap — Agents left uncommitted changes

The harness safety-committed `.openspec.yaml` after the proposal session and flagged `run.sh` dirty after the verify and spec-alignment sessions. These represent agents completing their work but not committing all artifacts. The `run.sh` issue was not actually a missed commit (the file was modified by the harness orchestrator, not the agent) but the proposal agent not committing its output file is a handoff gap.

### Tool Gap — No agent-browser in harness; E2E layers 3 and 4 skipped

Tests T.6 and T.7 (stats page contribution grid, writing streak display) were not run because the harness environment has no dev server or browser automation. Tests T.8–T.11 (holidays migration) were correctly deferred pending the gate. Layer 3 and 4 coverage remains a manual step.

### Review Gap — verify_report.md stated specs directory was missing

The verify session's report said "No `specs/` directory exists for this change" — incorrect, since `specs/` was committed at commit `0f7ebdd4` before the verify session ran. The spec-alignment report caught this and noted it. The underlying coverage assessment was still accurate, but the factual error in a verification report is a trust signal problem.

### Pipeline Gap — No phase for addressing PR review comments

The harness pipeline ends at the `pull-request` session followed by `final-spec-alignment` and `retro`. After the PR was created, GitHub Copilot left 6 review comments (including a real bug in `git_rollback`, stale task checkboxes, and a factual error in the verify report). The harness has no session to read and address PR review feedback. These comments had to be resolved manually outside the pipeline, breaking the autonomous end-to-end workflow.

---

## Improvement Ideas

**Apply all task groups before verification.** The harness should iterate through all non-conditional groups before running the verify session. Group 3 (conditional) can be legitimately skipped, but Groups 1 and 2 should both be applied. The current one-group-then-verify pattern forces the verify agent to become an apply agent when it finds failures.

**Separate verify from apply in harness logic.** If a verify session produces test failures, the harness should route back to an apply session for the next group, not allow the verify session to implement changes. Role separation produces more traceable history and avoids mixing implementation commits with verification commits.

**Gate the apply loop on test-check, not session count.** After each apply group, run `type-check` (cheap) as a pass/fail gate before moving on. If type-check fails after a group, route back to apply before proceeding. This catches the Group 1 → Group 2 dependency break automatically.

**Add explicit task group dependency declarations.** tasks.md Group 2 depended on Group 1 completing, and Group 3 was conditional on an external precondition. A simple dependency annotation (e.g., `depends_on: group_1`, `gate: holidays-table-confirmed`) would let the harness sequence groups correctly without relying on agent judgment.

**Enforce commit-before-exit in apply sessions.** The proposal agent left `.openspec.yaml` uncommitted. A post-session hook that checks for untracked/modified files and fails the session unless everything is staged would prevent safety-commit fallbacks and make session boundaries cleaner.

**Verify session should be read-only for source files.** Allowing the verify session to modify source files (as it did with tasks 2.1–2.10) makes the verify record ambiguous: did it verify, or did it implement and then verify itself? A verify session should run tests and report; it should not modify source files.

**Add a short "did the apply session complete all tasks?" check.** Before moving from Phase 2 to Phase 3, the harness should count unchecked tasks across all non-conditional groups. If any remain unchecked, continue the apply loop rather than hand off to verify.

**Add a review-response phase after PR creation.** After `pull-request`, the harness should poll for GitHub review comments (via `gh api`), then run a `review-response` session that reads the comments, applies fixes, and pushes follow-up commits. This closes the loop between PR creation and review feedback without manual intervention. The session should re-run `type-check` and `test:run` after applying fixes.

---

## Harness Observations

**Did fresh sessions resume effectively from file state?**

Yes, with one important caveat. Each session received a clear context prompt pointing to the artifacts directory, and the artifacts (proposal, design, tasks) provided sufficient context for each agent to operate without conversation history. The verify session in particular read tasks.md, understood the Group 1 completion, identified the root cause of test failures, and correctly associated it with the remaining Group 2 tasks — all from file state alone.

The exception was the KST-boundary edge case in `writingStatsUtils.test.ts`: the verify agent added test T.3 not because it remembered the design session's discussion, but because the design.md artifact preserved the concrete fixture specification. That file state was doing the memory work.

**Were task groups the right size?**

Group 1 (4 tasks, ~call-site changes only) was too small to stand alone as a verifiable unit. Its completion left the codebase in a broken intermediate state (`.toDate()` calls removed but models still typed as `Timestamp`). Group 2 should have been merged with Group 1 into a single atomic group, or the harness should have applied both before running verification.

Group 3 (conditional holidays migration, 5 tasks + 4 tests) was correctly sized and correctly gated. The conditional structure worked well.

**Did any phase need conversation memory that files couldn't provide?**

No phase was blocked by missing conversation memory. The artifacts carried sufficient context:
- `proposal.md` captured the why and what
- `design.md` captured architectural decisions with rationale
- `tasks.md` captured the step-by-step sequence with explicit checkboxes

The only observable gap was the verify report's incorrect claim about the missing specs directory — the verify agent apparently did not read `specs/` before writing its report, which a stateful conversation session might have avoided by having the specs directory in scope.

**What would improve cross-session continuity?**

1. **A session handoff note file.** A lightweight `handoff.md` that each session writes at exit (key decisions made, files changed, anything the next session should know) would reduce re-reading of the full artifact stack. The verify agent had to re-read design.md, tasks.md, and run tests to reconstruct what had been done — a one-paragraph handoff from the apply session would have been faster.

2. **Checkpoint files per group.** After completing a task group, writing a `checkpoint-group-N.md` with which tasks were checked and what type-check/test output was observed would allow the verify session to start from a known state rather than re-running type-check from scratch to establish baseline.

3. **Artifact quality gates.** The verify session should confirm it has read the specs directory before writing a coverage report that makes claims about coverage. A simple "list expected artifacts, confirm each exists" step at the start of verification would catch the verify report's factual error before it was written.
