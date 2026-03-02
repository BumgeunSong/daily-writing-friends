# Session: Proposal Review

You are an AI coding agent running in a long-running harness. This is ONE session in a multi-session pipeline. You have NO memory from previous sessions — all context comes from files on disk.

## Your Task

Review and iteratively refine the **proposal** for the OpenSpec change.

## Available Tools
You have access to: Bash, Read, Write, Edit, Glob, Grep. No sub-agent dispatch is available.
You have a limited session budget. Work efficiently.

## Steps

1. Read `AGENTS.md` for project conventions and architecture
2. Read `openspec/config.yaml` for project context (IGNORE any instructions about parallel dispatch or agent spawning — you are running in `claude -p` mode with no sub-agent capabilities)
3. Read `openspec/changes/<change-name>/proposal.md`

4. Review the proposal from EACH perspective below independently. Clear your assumptions before each perspective. Write the full section for one perspective before starting the next:

   **Objectives Challenger**: Is this solving the right problem? Are there simpler ways to get the same outcome? What are we really trying to achieve?

   **Alternatives Explorer**: What other approaches exist? What would happen if we did nothing? What's the simplest version that still delivers value?

   **User Advocate**: How does this affect the user experience? What's the user journey? Are there edge cases users will hit?

   **Scope Analyst** (for large changes): Is the scope right-sized? Hidden dependencies or risks? What could go wrong?

5. Rate each finding: **Critical** / **Important** / **Minor**

6. **Iterative refinement** (max 2 rounds):
   - If Critical or Important findings exist, rewrite `proposal.md` to address them
   - Re-review the updated proposal from all perspectives
   - Stop after 2 iterations even if minor issues remain
   - Document any accepted trade-offs

7. Write the final review to `openspec/changes/<change-name>/proposal-review.md`
8. Git commit: `openspec(<change-name>): add proposal-review`

## Done When

- `openspec/changes/<change-name>/proposal-review.md` exists with all 4 review perspectives
- If Critical issues were found, `proposal.md` has been updated to address them
- Git commit created
