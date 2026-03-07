# Handoff: test-smoke proposal-review

## What was done
- Reviewed `proposal.md` from 4 perspectives (Objectives Challenger, Alternatives Explorer, User Advocate, Scope Analyst)
- Found 4 Important issues in the original proposal and updated `proposal.md` to address them
- Re-reviewed the updated proposal (Round 2) — all Important issues resolved, only Minor findings remain
- Wrote `proposal-review.md` with full review and findings table

## Files changed
- **Modified**: `openspec/changes/test-smoke/proposal.md` — fixed T.7 scope claim, resolved replace-vs-separate ambiguity, added CI-readiness note, added mock fidelity risk acknowledgment, fixed Impact section consistency
- **Created**: `openspec/changes/test-smoke/proposal-review.md` — full 4-perspective review with findings summary
- **Modified**: `openspec/changes/test-smoke/handoff.md` — this file (updated from proposal session)

## Key decisions
- T.7 (review-response) is explicitly out of scope — requires external GitHub PR state that can't be stubbed
- Smoke test runs as a separate suite (`smoke-test.sh`) rather than replacing placeholders inline in `test-harness.sh`
- CI integration deferred to follow-up; smoke test is designed to be CI-ready (no API keys, no network, no interactive input)

## Notes for next session
- Proposal is approved with 4 Minor accepted trade-offs (see review summary table)
- Next step is the design phase — key implementation decisions: stub `claude` binary protocol, which `assert_*` helpers to use, temp directory cleanup strategy
- Consider reusing `assert_eq`/`assert_contains` from `test-harness.sh` to keep test infra DRY
- The 30-second runtime target should be enforced with a timeout wrapper
- The change sits on branch `long-running-harness-extract`
