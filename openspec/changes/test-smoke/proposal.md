## Why

The `harden-long-running-harness` retro found 3 bugs (stdin consumption, verify verdict mismatch, verify checkpoint collision) during a manual end-to-end smoke test — none were caught by the existing unit tests in `test-harness.sh`. The harness has no automated integration test that exercises the outer orchestration loop, so regressions in multi-session coordination remain undetectable until a real (expensive, slow) change is actually run.

## What Changes

- **Add `smoke-test.sh`** — a deterministic, repeatable end-to-end smoke test script at `scripts/long-running-harness/tests/smoke-test.sh` that exercises the full harness orchestration loop without requiring real AI sessions
- **Use a pre-populated stub change** — the smoke test creates a temporary change directory with pre-written `tasks.md` (multiple groups, mix of checked/unchecked tasks) and all planning artifacts, bypassing the proposal/design/review phases
- **Stub the `claude -p` invocations** — inject a mock `claude` binary via `PATH` that simulates agent behavior deterministically (checks off tasks, writes expected verify output), so the smoke test runs in seconds without API calls
- **Cover the outer loop behaviors** — specifically: group iteration (all groups processed, not just the first), stdin isolation (`< /dev/null` on session calls), tsc gate integration, checkpoint skip on apply groups, verify verdict parsing (heading and verdict on separate lines), and skill injection
- **Implement T.6, T.7, T.8** — replace the three placeholder integration tests in `test-harness.sh` with the smoke test, or run `smoke-test.sh` as a separate suite alongside the unit tests
- **Add npm script entry point** — add `"test:smoke": "bash scripts/long-running-harness/tests/smoke-test.sh"` to `package.json` for easy invocation

## Capabilities

### New Capabilities

- `harness-smoke-test`: Automated end-to-end smoke test for the long-running harness that exercises outer orchestration loop behaviors (group iteration, stdin isolation, checkpoint logic, verify verdict parsing, skill injection) using a stub agent and pre-populated artifacts, completing in under 30 seconds without AI API calls

### Modified Capabilities

_(none — no existing spec requirements are changing)_

## Impact

- **Files created**: `scripts/long-running-harness/tests/smoke-test.sh`
- **Files modified**: `package.json` (add `test:smoke` script), `scripts/long-running-harness/tests/test-harness.sh` (optionally remove T.6–T.8 placeholder stubs now covered by smoke-test)
- **Dependencies**: bash 3.2+ (macOS compatible), existing `run.sh` / `session.sh` harness scripts, no new external tools
- **No production code affected** — purely test infrastructure
