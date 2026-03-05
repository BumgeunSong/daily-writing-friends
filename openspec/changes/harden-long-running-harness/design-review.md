## Review Summary

**Status**: Ready
**Iteration**: 3

## Architecture

The simplified design cleanly separates concerns. `run.sh` owns the tsc gate, skill detection, and review-response routing. `session.sh` owns skill injection (via `HARNESS_SKILLS` env var) and handoff footer. Prompt files receive minimal edits (only `verify.md` and `pull-request.md`).

Prompt assembly order is specified: phase prompt → skill content → handoff footer (last).

## Security

Low surface. Skill files are version-controlled. `gh api` uses local auth token.

## Quality & Performance

tsc gate adds ~3s per group. Skill injection adds ~250-860 lines to system prompt depending on matches. `detect_skills()` uses case-insensitive grep and deduplicates output.

## Testability

Key risk (`set -e` interaction) is now explicitly addressed — design references `session.sh:83-93` pattern and T.1 requires testing under `set -euo pipefail`. PR extraction regex fixed to match GitHub URLs (`pull/[0-9]+`) not generic `#N`, with corrected test cases.

## API & Integration

`HARNESS_SKILLS` env var is fully backward-compatible. No signature changes to `session.sh`.

## Consolidated Findings

### Critical (from Round 1 — all addressed)

1. **Spec said `$8` positional arg, design said env var** → Fixed: spec updated to `HARNESS_SKILLS` env var
2. **Proposal-review said keyword detection "rejected"** → Fixed: review updated to reflect user chose keyword detection
3. **PR regex matched `Step #1` before real PR number** → Fixed: now uses `pull/[0-9]+` (GitHub URL pattern)
4. **Token budget claimed 440, actual worst case 857** → Fixed: design now says ~860 worst case

### Important (from Round 1 — all addressed)

1. **tsc gate `set -e` hazard** → Design now references `session.sh:83-93` pattern; T.1 tests under `set -euo pipefail`
2. **Prompt assembly order unspecified** → Design specifies: phase prompt → skills → handoff footer (last)
3. **Case sensitivity in keyword matching** → Design specifies `grep -qi`
4. **T.4 test expectation contradicted regex behavior** → T.4 rewritten to test GitHub URL extraction
5. **Skill deduplication** → Design requires deduplicate; T.2 tests duplicate scenario

### Minor (accepted)

1. Handoff footer runs on retro/final-spec-alignment (no successor) — minor token waste, not worth adding a phase allowlist
2. Keyword "type" has high false-positive rate — acceptable; `type-system` is 119 lines, low cost
3. `MAX_REVIEW_RESPONSE_ITERATIONS=1` implies loop — will remove constant, state "runs once"
4. tsc timeout not env-var configurable — will add `TSC_TIMEOUT="${TSC_TIMEOUT:-120}"`

## Accepted Trade-offs

- tsc-only gate misses logic bugs (verify catches them)
- Verify scope is prompt-only soft guardrail
- Keyword detection requires maintenance when adding new skills
- Review-response is fire-once
- Worst-case skill injection is ~860 lines (acceptable for system prompt)

## Revision History

- Round 1: 2026-03-04 - Architecture + Quality reviewers found: spec/design contradiction on `$8` vs env var, PR regex fragility, `set -e` hazard, prompt assembly order missing, case sensitivity, token budget error, test expectation bugs
- Round 2: 2026-03-04 - All Critical and Important findings addressed in design, specs, and tasks.
- Round 3: 2026-03-05 - Three-reviewer round (Architecture, Quality, Security) after frontmatter-driven skill injection and E2E verify enablement changes. Found: C1 PR regex still wrong in review-response spec, C2 agent-browser SKILL.md location confirmed (user-level symlink), C3 name collision mechanism unspecified. I1 path traversal via skill name, I2 word-splitting, I3 review-response security note, I4 useEffect test expectation wrong, I5 local output trap, I6 zombie processes. All addressed: name validation regex, realpath checks, quoted array expansion, security note in prompt, test fixes, cleanup instructions, gap report test added.
