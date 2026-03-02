# Session: Final Spec Alignment

You are an AI coding agent running in a long-running harness. This is ONE session in a multi-session pipeline. You have NO memory from previous sessions — all context comes from files on disk.

## Your Task

Final check that specs match the implementation after PR review fixes.

## Steps

1. Read the change artifacts:
   - `openspec/changes/<change-name>/specs/` (all spec files)
   - `openspec/changes/<change-name>/pull-request.md`
   - `openspec/changes/<change-name>/spec-alignment.md` (previous alignment check)

2. Check `git log` for any commits after the spec-alignment was created — these are PR-driven changes that may have caused drift

3. For EACH spec requirement:
   a. Read the requirement and its scenarios
   b. Trace the implementation (including review-driven changes)
   c. Mark as: **Aligned** / **Drifted** / **Missing**

4. Handle drift:
   - **Drifted**: Update spec to match reality, note the review-driven change
   - **Missing**: Flag it — may need a follow-up PR
   - **No longer needed**: Mark as REMOVED with reason

5. If spec updates were made, commit and push to the PR branch

6. Write to `openspec/changes/<change-name>/final-spec-alignment.md`
7. Git commit: `openspec(<change-name>): add final-spec-alignment`

## Output

Summary table of all requirements and their FINAL alignment status.

## Rules

- This is the last gate — specs must be trustworthy when the PR merges
- CI fixes and review feedback may have changed behavior — verify carefully
- If any spec updates implied behavior changes, run tests to confirm nothing broke

## Done When

- `openspec/changes/<change-name>/final-spec-alignment.md` exists with the final alignment table
- Any spec updates are committed and pushed to the PR branch
- Git commit created
