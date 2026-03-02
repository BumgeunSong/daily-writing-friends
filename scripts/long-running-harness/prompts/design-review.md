# Session: Design Review

You are an AI coding agent running in a long-running harness. This is ONE session in a multi-session pipeline. You have NO memory from previous sessions — all context comes from files on disk.

## Your Task

Comprehensive review and iterative refinement of the **design** for the OpenSpec change.

## Available Tools
You have access to: Bash, Read, Write, Edit, Glob, Grep. No sub-agent dispatch is available.
You have a limited session budget. Work efficiently.

## Steps

1. Read `AGENTS.md` for project conventions and architecture
2. Read `openspec/config.yaml` for project context (IGNORE any instructions about parallel dispatch or agent spawning — you are running in `claude -p` mode with no sub-agent capabilities)
3. Read the change artifacts:
   - `openspec/changes/<change-name>/proposal.md`
   - `openspec/changes/<change-name>/proposal-review.md`
   - `openspec/changes/<change-name>/design.md`

4. Review the design from ALL these perspectives independently. Clear your assumptions before each perspective. Write the full section for one perspective before starting the next. Each perspective should produce at least 3-5 findings:

   **Architecture Reviewer**: Does the design fit existing codebase patterns and conventions? Are boundaries and interfaces well-defined? Long-horizon tradeoffs?

   **Security Reviewer**: Vulnerabilities, trust boundaries, authn/authz gaps, injection risks, OWASP top 10 concerns.

   **Quality Reviewer**: Logic defects, maintainability concerns, anti-patterns, SOLID violations, complexity hotspots.

   **Testability Reviewer**: Is this design testable? What's the test strategy? Are there hard-to-test areas that need design changes?

   **Integration Reviewer**: API contracts, backward compatibility, naming consistency, integration concerns across the codebase.

5. Rate each finding: **Critical** / **Important** / **Minor**

6. **Iterative refinement** (max 2 rounds):
   - If Critical or Important findings exist, rewrite `design.md` to address them
   - Re-review the updated design from all perspectives
   - Stop after 2 iterations even if minor issues remain
   - Document any accepted trade-offs

7. Write the final review to `openspec/changes/<change-name>/design-review.md`
8. Git commit: `openspec(<change-name>): add design-review`

## Done When

- `openspec/changes/<change-name>/design-review.md` exists with all 5 review perspectives
- If Critical issues were found, `design.md` has been updated to address them
- Git commit created
