# Proposal Review: test-smoke

**Reviewed**: proposal.md (after 1 round of refinement)
**Verdict**: Approved with minor notes

---

## Objectives Challenger

**Is this solving the right problem?**

Yes. The retro from `harden-long-running-harness` found 3 bugs that all lived in the orchestration loop — the exact layer that has zero automated test coverage. Unit tests (T.1–T.5) cover individual functions well (`run_tsc_gate`, `get_section_content`, `detect_skills`, etc.) but cannot catch bugs in how these functions compose across sessions. The proposal correctly identifies this gap.

**Are there simpler ways?**

- Adding more unit tests won't help — the bugs are emergent from multi-session orchestration (stdin consumption, checkpoint key collisions, verify verdict parsing across lines).
- A manual smoke test checklist is what found the bugs originally, but it's expensive ($10+ per run) and non-repeatable.
- The stub-based approach is the right middle ground: no API costs, deterministic, fast.

**Findings:**
- **Minor**: The proposal could explicitly state _which_ of the 3 retro bugs would have been caught by this smoke test. This would make the value proposition concrete and verifiable.

---

## Alternatives Explorer

**What other approaches exist?**

| Approach | Pros | Cons |
|----------|------|------|
| Stub `claude` + run real `run.sh` (proposed) | Tests actual orchestration code | Stub must match protocol |
| `--dry-run` flag in `run.sh` | No separate test script | Couples test logic with production code |
| Bats testing framework | Structured assertions, TAP output | Adds a dependency; existing tests use plain bash |
| More unit tests only | Low maintenance | Cannot catch orchestration bugs |
| Do nothing | Zero effort | Regressions remain invisible until expensive real runs |

**Assessment**: The proposed approach (stub `claude` + run real `run.sh`) is the best fit. It tests the actual orchestration code path without introducing new dependencies or coupling test logic into production scripts. The existing test style (plain bash with `assert_*` helpers) is already established in `test-harness.sh`, so `smoke-test.sh` follows a familiar pattern.

**Findings:**
- **Minor**: Consider whether the smoke test should reuse the `assert_eq`/`assert_contains` helpers from `test-harness.sh` (via sourcing) rather than duplicating them, to keep test infrastructure DRY.

---

## User Advocate

The "users" here are developers maintaining the harness.

**User journey**: Developer modifies `run.sh` or `session.sh` → runs `npm run test:smoke` → gets pass/fail in <30s → confidence to merge.

**Positive aspects:**
- `npm run test:smoke` is a discoverable, zero-config entry point
- No API keys, no network, no interactive input required
- bash 3.2+ compatibility means it works on stock macOS

**Edge cases to consider:**
- Temp directory cleanup on test failure (trap + cleanup handler needed)
- The stub `claude` binary is injected via `PATH` — must be cleaned up even on early exit
- If `run.sh` interface changes (args, env vars), the smoke test breaks silently unless it's run

**Findings:**
- **Important** (addressed in Round 1): CI integration was missing. The updated proposal now states the test is CI-ready and defers actual CI config to a follow-up.
- **Minor**: The `test:smoke` npm script should be referenced in `AGENTS.md` "Build & Validation Commands" section so agents discover it.

---

## Scope Analyst

**Is the scope right-sized?**

Yes. One new test script, one npm script entry, minor edits to `test-harness.sh`. The list of behaviors to cover (group iteration, stdin isolation, tsc gate, checkpoint skip, verify verdict parsing, skill injection) maps directly to the 3 bugs found plus 3 related risk areas.

**Hidden dependencies:**
- The smoke test depends on `run.sh`'s internal structure: checkpoint format, group parsing via `## ` headers, verify report format, `HARNESS_SKILLS` env var contract. These are stable interfaces but not documented — changes could break the smoke test.
- The stub `claude` must simulate: reading `tasks.md`, checking off tasks (sed/awk on the file), writing `verify_report.md` with `**PASS**` verdict. This is the main complexity in the implementation.

**T.7 scope exclusion** (addressed in Round 1): The updated proposal correctly scopes T.7 (review-response) out, since it requires external GitHub PR state that can't be stubbed locally.

**What could go wrong:**
- The mock becomes stale if the harness protocol evolves — mitigated by the proposal's "keep the stub minimal" guidance
- Flaky behavior from file-system ordering or timing — mitigated by deterministic stub (no async, no network)

**Findings:**
- **Important** (addressed in Round 1): Mock fidelity risk is now acknowledged in the proposal's Impact section.
- **Minor**: The 30-second target is stated but not enforced. Consider wrapping the smoke test itself in a `timeout` to fail fast if something hangs.

---

## Round 2 Re-review (after proposal refinement)

Changes made in Round 1:
1. Corrected T.6/T.7/T.8 scope — T.7 excluded, rationale given
2. Added CI-readiness note
3. Added mock fidelity risk acknowledgment in Impact
4. Fixed Impact section consistency (T.6/T.8 only, not T.6–T.8)

**Re-review verdict**: All Important issues from Round 1 are addressed. Remaining findings are Minor — acceptable to proceed.

---

## Summary of Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | T.7 incorrectly claimed as in-scope | Important | Fixed in proposal |
| 2 | "Replace or run separately" ambiguity for T.6–T.8 | Important | Fixed in proposal |
| 3 | CI integration not mentioned | Important | Fixed in proposal |
| 4 | Mock fidelity risk not acknowledged | Important | Fixed in proposal |
| 5 | Could list which retro bugs the smoke test would catch | Minor | Accepted |
| 6 | Consider reusing assert helpers from test-harness.sh | Minor | Accepted |
| 7 | Add `test:smoke` to AGENTS.md commands section | Minor | Accepted |
| 8 | Enforce 30s timeout on the smoke test itself | Minor | Accepted |

**Accepted trade-offs:**
- The stub `claude` binary introduces a maintenance surface that must evolve with the harness protocol. This is acknowledged in the proposal and accepted as the cost of integration-level testing without real API calls.
- T.7 (review-response) remains untested by this change. A separate test using a mock `gh` CLI could cover it in the future.
