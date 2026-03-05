## ADDED Requirements

### Requirement: Type-check gate after apply group

After each apply-group session completes successfully, the harness SHALL run `timeout 120 npx tsc --noEmit`. If type-check fails, the group MUST retry instead of proceeding to the next group.

#### Scenario: Type-check passes
- **WHEN** an apply-group session completes and `tsc --noEmit` exits 0
- **THEN** the harness proceeds to check unchecked task count normally

#### Scenario: Type-check fails
- **WHEN** an apply-group session completes and `tsc --noEmit` exits non-zero
- **THEN** the harness retries the same group with tsc error output (truncated to last 100 lines) appended to extra_context

#### Scenario: Type-check hangs
- **WHEN** `tsc --noEmit` does not complete within 120 seconds
- **THEN** the command is killed and treated as a failure

### Requirement: tsc gate must not terminate harness

The tsc gate function MUST capture exit codes internally and never cause the harness to exit via `set -e`.

#### Scenario: Non-zero exit code handled
- **WHEN** `tsc --noEmit` exits non-zero
- **THEN** `run.sh` continues executing (retry loop or next group), not terminated by `set -e`

### Requirement: Gap report on apply loop exit

After the apply loop finishes iterating all groups, the harness SHALL count total unchecked tasks. If any remain, it MUST write `apply_gaps.md` and continue to Phase 3.

#### Scenario: All tasks complete
- **WHEN** the apply loop finishes and zero `- [ ]` tasks remain in tasks.md
- **THEN** no `apply_gaps.md` is created and Phase 3 begins

#### Scenario: Tasks remain unchecked
- **WHEN** the apply loop finishes and N > 0 `- [ ]` tasks remain
- **THEN** `apply_gaps.md` is written listing the unchecked tasks, a WARNING is logged, and Phase 3 begins
