## What was done

Generated the `proposal.md` artifact for the `test-smoke` OpenSpec change.

## Files changed

- **Created**: `openspec/changes/test-smoke/proposal.md`
- **Created**: `openspec/changes/test-smoke/handoff.md` (this file)

## Key decisions

- **Interpreted "smoke test" as automated harness integration test**: The brief was minimal ("smoke test"), but the `harden-long-running-harness` retro explicitly identified that the manual smoke test found 3 real bugs that unit tests missed, and called integration testing "essential." T.6–T.8 in `test-harness.sh` are placeholder stubs for exactly this purpose. The proposal formalizes this into a reproducible script.
- **Stub agent approach**: Rather than proposing a test that requires real Claude API calls, the proposal specifies a mock `claude` binary injected via PATH. This keeps the smoke test deterministic, fast (<30s), and free.
- **Single new capability `harness-smoke-test`**: No existing specs were found in `openspec/specs/` (directory is empty), so no modified capabilities section was needed.

## Notes for next session

- **Next artifact**: `proposal-review` — requires dispatching reviewer agents in parallel per `openspec/REVIEW_CONFIG.yaml`
- **openspec status**: Run `openspec status --change "test-smoke"` to confirm `proposal` is now `done` and `proposal-review` is `ready`
- The change sits on branch `long-running-harness-extract`; all commits should go to that branch
- The `openspec/specs/` directory is empty — no pre-existing capability specs to reference
