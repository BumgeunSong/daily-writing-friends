## Review Summary

**Status**: Ready (after revision)
**Iteration**: 2 of max 2

## Findings

### Critical (from Round 1 — addressed in revision)

1. **Apply-loop gates solved an already-fixed problem** (Objectives Challenger, Alternatives Explorer): The checkpoint collision was the real root cause, already fixed by `skip_checkpoint=true`. Two-layer gate (tsc + unit tests) was over-engineered. **Resolution**: Downscoped to tsc-only gate (~3s). Unit tests deferred to verify phase.

2. **Verify scope control + apply-fix routing was over-engineered** (Objectives, Alternatives, Scope): Verify implementing Group 2 was a one-time consequence of the checkpoint bug. With the bug fixed, verify rarely encounters source bugs. Full apply-fix routing loop added a new harness phase for a rarely-triggered path. **Resolution**: Downscoped to prompt-only edit in `verify.md`. No apply-fix routing.

3. **5 changes bundled = high blast radius** (Scope, Alternatives): All reviewers flagged bundling core orchestration changes with additive improvements. **Resolution**: Simplified each change to minimize blast radius. All changes are now small and independent.

4. **`session.sh` growing to 8+ positional args is fragile** (Scope): **Resolution**: Skill injection and handoff handled via environment variables or internal logic in `session.sh`, not new positional args.

### Important (from Round 1 — addressed in revision)

1. **Skill keyword detection is fragile** (Alternatives, Objectives): "Always inject top 3" is simpler and more reliable. **Resolution**: Adopted. Always inject `code-style`, `testing`, `react-component` for apply/verify sessions.

2. **Modifying all 12 prompts for handoff is high effort** (Alternatives, Scope): Handoff gap was a symptom of the checkpoint bug. **Resolution**: `session.sh` appends a shared handoff footer automatically. Zero prompt file edits for handoff.

3. **Verify "MUST NOT modify src/" has no hard enforcement** (User, Scope): Agent already violated scope once. **Resolution**: Accepted as prompt-only soft guardrail. If needed later, can add post-verify `git diff` check.

4. **Review-response overlaps with pull-request prompt Step 3** (User): **Resolution**: Will remove Step 3 from `pull-request.md` and move to `review-response.md`.

### Minor

1. Per-capability env-var toggles recommended for safe rollout (User Advocate)
2. Gap report should be a file artifact (`apply_gaps.md`), not just a log message (User)
3. Log which skills were injected for debugging (User, Scope)

## Key Questions Raised

- Should the health gate run unit tests too? **Decision: No.** tsc-only between groups; verify handles the full test suite.
- Should verify have hard enforcement (git diff check)? **Decision: Not now.** Prompt-only is sufficient; add enforcement later if needed.
- Should handoff be per-session files or overwritten? **Decision: Neither.** `session.sh` appends footer to prompt; agent writes handoff as part of normal session; no naming convention needed.

## Alternatives Considered

| Alternative | Verdict |
|---|---|
| Unit tests between groups (in addition to tsc) | Rejected — 30-60s per group for marginal gain; verify already runs full suite |
| Apply-fix routing loop (verify → apply → verify) | Rejected — heavy machinery for a problem that rarely occurs once checkpoint bug is fixed |
| Always inject top 3 skills (no keyword detection) | Rejected by user — skills should be task-dependent, not always-injected. Keyword detection retained with `code-style` as always-on baseline. |
| Handoff edits in all 12 prompts | Rejected — high merge-conflict risk; `session.sh` footer is single-point-of-change |
| Do nothing for verify scope | Rejected — even a soft guardrail improves traceability |
| Run harness once more before implementing | Considered but deferred — tsc gate provides defense-in-depth regardless of checkpoint fix |

## Accepted Trade-offs

- **tsc-only gate misses logic bugs**: Types may match but behavior changes. Acceptable — verify catches these.
- **Verify scope is soft guardrail only**: Agent could still modify source files. Acceptable — the prompt instruction + correct apply loop should make this rare.
- **Always-inject skills may include irrelevant content**: `react-component` injected for non-UI tasks. Acceptable — agents filter irrelevant context well; total is ~330 lines.
- **Review-response is fire-once**: Late-arriving reviews won't be caught.

## Revision History

- Round 1: 2026-03-04 - Multi-agent review (4 agents: objectives-challenger, alternatives-explorer, user-advocate, scope-analyst). Found 4 Critical issues: over-engineering of apply gates, verify scope, blast radius, and positional arg fragility.
- Round 2: 2026-03-04 - Revised proposal to dramatically simplify all 5 changes. Tsc-only gate, prompt-only verify fix, keyword-based skill injection via env var, session.sh handoff footer. No new Critical findings after revision.
