## Why

The long-running harness orchestrated two changes (`stats-supabase-migration`, `improve-quill-image-upload`). Retrospectives revealed: the apply loop exited after one group due to a checkpoint collision (now hotfixed but unverified at scale), the verify session implemented 10 tasks it was supposed to only verify, PR review comments had no automated response phase, sessions started cold with no handoff context, and agents couldn't access project-specific skills because `claude -p` has no skill system.

A multi-agent review of the original proposal found several items were over-engineered — solving symptoms of the checkpoint bug rather than real remaining gaps. This revised proposal takes the simplest approach for each improvement.

## What Changes

- **Add a tsc-only gate after each apply group** — run `tsc --noEmit` (~3s) between groups to catch type-breaking intermediate states. No unit tests between groups (verify phase handles that). Add a gap report when tasks remain unchecked after the loop.
- **Tighten verify prompt** — prompt-only edit to `verify.md` instructing it to prefer test-file fixes and report FAIL with root cause for source bugs. No apply-fix routing loop (over-engineered for a problem that rarely occurs once the apply loop works correctly).
- **Add a review-response phase** after PR creation — conditionally runs when `gh api` detects review comments.
- **Add session handoff via `session.sh` footer** — `session.sh` automatically appends a handoff instruction to every session's system prompt. No need to edit all 12 prompt files.
- **Inject skills via keyword detection** — `run.sh` scans task group content from tasks.md for keywords, determines relevant skills, and passes them to `session.sh` for injection into the system prompt. `code-style` is always injected for apply/verify phases.

## Capabilities

### New Capabilities
- `apply-loop-tsc-gate`: Type-check gate between apply groups with post-loop gap reporting
- `verify-prompt-tightening`: Verify prompt updated to prefer test-only fixes and report source bugs as FAIL
- `review-response-phase`: Conditional pipeline phase that reads PR review comments via `gh api`
- `session-handoff-footer`: `session.sh` appends handoff instruction automatically to all sessions
- `skill-injection`: Keyword-based detection of relevant project skills from task content, injected into `claude -p` system prompts

### Modified Capabilities

- `verify`: Prompt updated from "fix and retest anything" to "prefer test fixes; report FAIL for source bugs"

## Impact

- **Files modified**: `scripts/long-running-harness/run.sh` (tsc gate, gap report, review-response routing), `scripts/long-running-harness/session.sh` (handoff footer, skill injection), `scripts/long-running-harness/prompts/verify.md` (scope tightening)
- **Files created**: `scripts/long-running-harness/prompts/review-response.md`
- **Dependencies**: `gh` CLI for review-response phase (already installed)
- **Risk**: Low — core orchestration changes are minimal (tsc gate is ~15 lines, gap report is ~8 lines). Largest changes are in `session.sh` (additive, backward-compatible).
