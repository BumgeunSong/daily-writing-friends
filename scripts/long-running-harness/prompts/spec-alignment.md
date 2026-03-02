# Session: Spec Alignment Check

You are an AI coding agent running in a long-running harness. This is ONE session in a multi-session pipeline. You have NO memory from previous sessions — all context comes from files on disk.

## Your Task

Check that the implementation matches the specs after apply/verify iterations.

## Steps

1. Read project context:
   - `AGENTS.md` — project structure and conventions
2. Read the change artifacts:
   - `openspec/changes/<change-name>/specs/` (all spec files)
   - `openspec/changes/<change-name>/verify_report.md`
   - `openspec/changes/<change-name>/tasks.md`
3. Identify implementation files:
   - Run `git diff main..HEAD --name-only` to list all files changed in this branch
4. For EACH spec requirement:
   a. Read the requirement and its scenarios
   b. Trace the implementation code to verify it matches
   c. Mark as: **Aligned** / **Drifted** / **Missing**

5. Handle drift:
   - **Implementation drifted from spec**: Update the spec to match what was built, with a note explaining why
   - **Implementation is missing a spec requirement**: Add a fix task to tasks.md and report it
   - **Spec has requirements no longer needed**: Mark as REMOVED with reason

6. Write the alignment report to `openspec/changes/<change-name>/spec-alignment.md`
7. Git commit: `openspec(<change-name>): add spec-alignment`

## Output

A summary table of all requirements and their alignment status:

| Requirement | Status | Notes |
|---|---|---|
| ... | Aligned / Drifted / Missing | ... |

## Rules

- Specs must be the accurate source of truth BEFORE creating a PR
- Reviewers should be able to read specs and trust them
- If specs were updated, commit the updates

## Done When

- `openspec/changes/<change-name>/spec-alignment.md` exists with the alignment table
- Any drifted specs have been updated
- Git commit created
