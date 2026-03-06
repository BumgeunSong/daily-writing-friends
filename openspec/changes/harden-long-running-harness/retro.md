## Change Retro: harden-long-running-harness

### Timeline

1. **Proposal/Review**: Identified 5 gaps in the long-running harness — no type checking, no skill injection, no review-response, no session handoff, verify too restricted. Scoped to shell-script-only changes (no app code).

2. **Design**: 6 decisions (D1-D6). Key turning point: user rejected adding `harness-keywords` to SKILL.md frontmatter — pivoted to separate `match-skills.sh` that reads canonical `name`/`description` fields. This preserved the SKILL.md format while enabling harness-specific matching.

3. **Design Review**: 3-reviewer parallel review (Architecture/opus, Quality/sonnet, Security/sonnet). Found 3 critical issues (PR regex wrong, name collision unspecified, agent-browser location), 6 important issues (path traversal, word-splitting, zombie processes). All fixed before implementation.

4. **Specs**: 5 spec files covering apply-loop-gates, skill-injection, verify-scope-control, review-response-phase, session-handoff.

5. **Tasks**: 15 implementation tasks + 8 test tasks (5 unit, 3 integration placeholders).

6. **Apply**: All 15 implementation tasks completed. Key challenge: bash 3.2 compatibility — `declare -A` (associative arrays) not available on macOS, replaced with string-based deduplication.

7. **Verify**: 21 shell unit tests written and passing. Two bugs found and fixed during testing:
   - `timeout` command missing on macOS → added portability shim to run.sh
   - Test hanging on mock `sleep 999` → fixed with `exec sleep` to prevent orphan child processes

8. **Spec Alignment**: Found tsc retry counter double-increment bug — `continue` missing after tsc-failure branch caused retry to burn two slots per failure. Fixed.

9. **PR**: Created #503.

10. **Smoke Test**: Ran the harness end-to-end on a trivial change (`test-harness-smoke` — text truncation utility). Pre-populated planning artifacts, exercised apply loop + tsc gate + skill injection + verify + closing phases. 13 sessions total, ~17 minutes. Found 3 bugs:
    - Apply loop stdin consumption — `while read < <(grep ...)` shared stdin with child `claude -p` process, causing only 1 of 3 groups to be processed
    - Verify verdict grep mismatch — `grep "overall verdict.*pass"` expected same line but agent writes heading and verdict on separate lines
    - Verify checkpoint prevents retry — `run_session` saved checkpoint after iteration 1, causing iteration 2 to be skipped via `checkpoint_done`

### Wins

- **Multi-reviewer design review caught real bugs**: The 3-agent parallel review found the PR regex issue (would match `Step #1` as PR number) and the retry counter pattern that later manifested as the double-increment bug. Worth the cost.
- **Frontmatter-driven skill matching**: Inspired by the force-eval hook, the approach reads existing SKILL.md metadata without modifying the canonical format. Clean separation of concerns.
- **Portability-first testing**: The perl-based timeout shim and `exec sleep` pattern in tests handle macOS's missing `timeout` gracefully. Tests run without coreutils.
- **bash 3.2 compatibility**: Caught early and fixed (no associative arrays). match-skills.sh works on stock macOS bash.
- **Smoke test found 3 real bugs**: Running the harness on a trivial change caught stdin consumption, verify verdict mismatch, and verify checkpoint collision — none of which were caught by unit tests. Integration testing of the orchestration logic is essential.

### Misses

- **Retry counter double-increment** (Process Gap): The apply loop's tsc-failure retry ran an inline session then fell through to the bottom-of-loop increment. The inline retry pattern is fragile — should have used `continue` from the start. Found during spec-alignment, not during apply.
- **Test timeout shim required iteration** (Tool Gap): First attempt (no-op shim) caused hanging tests. Second attempt (perl exec) caused orphan child processes. Third attempt (perl exec + mock `exec sleep`) worked. The test infrastructure for shell scripts on macOS needs more thought upfront.
- **detect_skills() not unit-tested** (Review Gap): The keyword scanning and phase defaults in `detect_skills()` are only tested indirectly. Direct unit testing was descoped because it requires real skill directories. Should add mock-based tests.
- **Apply loop stdin leak** (Shell Gap): Classic `while read` bug — child processes (`claude -p`, `tee`) consumed stdin from the process substitution, silently skipping groups 2 and 3. Fixed with `< /dev/null` on the `session.sh` call. Unit tests couldn't catch this because they don't test the outer loop orchestration.
- **Verify verdict format assumption** (Integration Gap): The grep pattern assumed heading and verdict would be on the same line. In practice, agents write them on separate lines (`## Overall Verdict\n\n**PASS**`). Fixed with two separate greps.
- **Verify checkpoint collision** (Logic Gap): `run_session` unconditionally saved a checkpoint after the verify session, making the retry loop's iteration 2 skip immediately. Fixed by passing `skip_checkpoint=true` like the apply loop does.

### Ideas

- **Timeout wrapper function**: Create a shared `safe_timeout()` in a `lib.sh` that handles macOS/Linux portability once, instead of duplicating the shim in run.sh, session.sh, and tests.
- **Shell test framework**: The ad-hoc assert functions work but are fragile. Consider adopting `bats-core` for future shell test suites — it handles subshell isolation, setup/teardown, and TAP output.
- **Skill keyword config file**: The hardcoded `SKILL_KEYWORDS` list in run.sh could be extracted to a config file, making it easier to add new keywords without modifying the harness script.
