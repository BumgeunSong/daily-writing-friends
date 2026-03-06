# Spec Alignment Report — harden-long-running-harness

## Alignment Summary

| Spec File | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| apply-loop-gates | Type-check gate after apply group | Aligned | `run_tsc_gate()` runs after each group; on failure, retries with `TSC_ERRORS` in extra_context |
| apply-loop-gates | tsc gate must not terminate harness | Aligned | `set +e` / `set -e` bracket the `timeout npx tsc` call; exit code captured via return value |
| apply-loop-gates | Gap report on apply loop exit | Aligned | After the loop, `apply_gaps.md` written when `total_unchecked > 0`; Phase 3 continues unconditionally |
| session-handoff | Handoff instruction appended by session.sh | Aligned | `session.sh` appends the `## Session Handoff` footer after skill content for every session |
| session-handoff | Agent writes handoff | Aligned | Footer instructs agent to write `openspec/changes/<change-name>/handoff.md` with required sections |
| session-handoff | New prompts get handoff automatically | Aligned | Footer is appended in `session.sh`, not in individual prompt files; new prompts inherit it |
| verify-scope-control | Verify prompt prefers test-file fixes | Aligned | `verify.md` contains explicit "Prefer test-file fixes" and "Source-level bugs → document, don't fix" sections |
| verify-scope-control | Verify runs E2E tests with agent-browser and dev3000 | Aligned | `verify.md` step 3.5 covers E2E environment setup: dev server, agent-browser check, dev3000 start |
| review-response-phase | PR comment detection | Aligned | `run.sh` uses `gh api .../pulls/.../comments` and `.../reviews`; logs WARNING when PR number not found or gh not available |
| review-response-phase | Conditional review-response session | Aligned | Session runs only when `TOTAL_FEEDBACK > 0`; skipped with log message when zero |
| review-response-phase | Review-response agent behavior | Aligned | `review-response.md` covers: read via `gh api`, address each comment, run tsc + tests, push; security note present |
| skill-injection | Frontmatter-based skill matching | Aligned | `match-skills.sh` reads YAML frontmatter (`name`, `description`); scans project-level then user-level; validates name with `SAFE_NAME_RE` |
| skill-injection | Skill detection from task content | Aligned | `detect_skills()` in `run.sh` iterates `SKILL_KEYWORDS` against group content and calls `match-skills.sh <keyword>` |
| skill-injection | Always-injected skills by phase | Aligned | `detect_skills()` case statement: `apply-group` → `code-style`; `verify` → `testing type-system code-style agent-browser`; `design` → `daily-writing-friends-design` |
| skill-injection | Skill content injected into system prompt | Aligned | `session.sh` reads `HARNESS_SKILLS`, resolves paths, appends content under `## Project Conventions (from skills)` header before handoff footer; injected names logged to `harness.log` |

## Drifted Requirements

### apply-loop-gates: Type-check gate retry logic

**Spec says:** When tsc fails, the harness retries the same group with tsc error output appended to `extra_context`.

**Implementation does:** On tsc failure the retry counter increments and a second `run_session` call is made immediately within the same `while` iteration — this is an inline second call rather than continuing the outer `while` loop back to the top. After the inline retry, the code falls through to re-check `unchecked` and then increments `retry` again via `retry=$((retry + 1))` at the bottom of the loop, which can double-count the retry.

**Concrete issue:** The outer retry loop structure is:
```
while retry <= MAX_APPLY_RETRIES:
  run apply
  if tsc fails:
    retry++
    if retry <= MAX_APPLY_RETRIES:
      run apply again (inline)
  re-check unchecked
  retry++   ← always increments, even after the inline tsc-retry path
```
This means a tsc failure on attempt 1 causes `retry` to go `0 → 1 (tsc fail) → 2 (bottom of loop)`, using two retry slots for one tsc failure. With `MAX_APPLY_RETRIES=2` the effective retry budget after a tsc failure is only 0 additional retries (the second inline attempt consumes the last slot immediately and then `retry++` at the bottom sets it to 2, exiting the loop).

**Severity:** Minor behavioral drift — the intent (retry with tsc context) is present, but the retry counting is skewed relative to the spec's plain description. In practice the group still gets a second attempt with tsc errors; it just does not get a clean `MAX_APPLY_RETRIES` independent retries.

**Resolution:** Restructure so tsc-failure retry continues the outer loop rather than using an inline second call, and only increment `retry` once per outer loop iteration regardless of path taken.

### review-response-phase: Conditional review-response — skip log message wording

**Spec says:** Log "SKIP: no PR review comments" when zero comments.

**Implementation does:** Logs "SKIP: PR #$PR_NUMBER has no review comments" — which is semantically equivalent but the wording differs slightly.

**Severity:** Negligible — functional behavior matches.

## Missing Requirements

None. Every requirement in all five spec files has a corresponding implementation.

## Conclusion

The implementation is in strong alignment with all five spec areas. All fifteen requirements across `apply-loop-gates`, `session-handoff`, `verify-scope-control`, `review-response-phase`, and `skill-injection` are implemented. The only meaningful drift is a retry-counter double-increment in the tsc gate path inside the apply loop: the correct behavior (retry with tsc errors in context) does execute, but the retry budget accounting does not match a clean per-attempt count. This does not break the feature but may exhaust retries faster than the spec implies under repeated tsc failures. The log message wording divergence in the skip path is cosmetic. No requirements are missing.
