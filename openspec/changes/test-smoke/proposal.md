## Why

The `harden-long-running-harness` retro found 3 bugs (stdin consumption, verify verdict mismatch, verify checkpoint collision) during a manual end-to-end smoke test — none were caught by the existing unit tests in `test-harness.sh`. The harness has no automated integration test that exercises the outer orchestration loop, so regressions in multi-session coordination remain undetectable until a real (expensive, slow) change is actually run.

## What Changes

- **Add `smoke-test.sh`** — a deterministic, repeatable end-to-end smoke test script at `scripts/long-running-harness/tests/smoke-test.sh` that exercises the full harness orchestration loop without requiring real AI sessions
- **Use a pre-populated stub change** — the smoke test creates a temporary change directory with pre-written `tasks.md` (multiple groups, mix of checked/unchecked tasks) and all planning artifacts, bypassing the proposal/design/review phases
- **Stub the `claude -p` invocations** — inject a mock `claude` binary via `PATH` that simulates agent behavior deterministically (checks off tasks, writes expected verify output), so the smoke test runs in seconds without API calls
- **Cover the outer loop behaviors** — specifically: group iteration (all groups processed, not just the first), stdin isolation (`< /dev/null` on session calls), tsc gate integration, checkpoint skip on apply groups, verify verdict parsing (heading and verdict on separate lines), and skill injection
- **Replace T.6 and T.8 placeholders** — the smoke test covers T.6 (dry-run apply loop) and T.8 (skill injection); T.7 (review-response) remains out of scope as it requires external GitHub PR state. Remove the T.6/T.8 SKIP stubs from `test-harness.sh` and add a cross-reference to `smoke-test.sh`
- **Add npm script entry point** — add `"test:smoke": "bash scripts/long-running-harness/tests/smoke-test.sh"` to `package.json` for easy invocation
- **CI-ready** — the smoke test should be runnable in CI (no API keys, no network, no interactive input); CI integration itself is a follow-up concern

## Capabilities

### New Capabilities

- `harness-smoke-test`: Automated end-to-end smoke test for the long-running harness that exercises outer orchestration loop behaviors (group iteration, stdin isolation, checkpoint logic, verify verdict parsing, skill injection) using a stub agent and pre-populated artifacts, completing in under 30 seconds without AI API calls

### Modified Capabilities

_(none — no existing spec requirements are changing)_

## Impact

- **Files created**: `scripts/long-running-harness/tests/smoke-test.sh`
- **Files modified**: `package.json` (add `test:smoke` script), `scripts/long-running-harness/tests/test-harness.sh` (replace T.6/T.8 SKIP stubs with cross-reference to smoke-test.sh; T.7 remains as a placeholder)
- **Dependencies**: bash 3.2+ (macOS compatible), existing `run.sh` / `session.sh` harness scripts, no new external tools
- **No production code affected** — purely test infrastructure
- **Mock fidelity risk**: The stub `claude` binary must simulate realistic behavior (checking tasks, writing verify reports). If the harness protocol changes, the stub needs updating. Keep the stub minimal — simulate outputs only, not internal logic
