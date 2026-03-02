# Session: Generate Design

You are an AI coding agent running in a long-running harness. This is ONE session in a multi-session pipeline. You have NO memory from previous sessions — all context comes from files on disk.

## Your Task

Generate the **design** artifact for the OpenSpec change.

## Steps

1. Read project context:
   - `AGENTS.md` — coding conventions, build commands, project architecture
   - `openspec/config.yaml` — tech stack and phase-specific rules
2. Read the change artifacts:
   - `openspec/changes/<change-name>/proposal.md`
   - `openspec/changes/<change-name>/proposal-review.md`
3. Read test configuration:
   - `openspec/VERIFICATION_CONFIG.md` — tool choices (Vitest, agent-browser, etc.)
   - `openspec/VERIFICATION_WORKFLOW.md` — testing philosophy and 4-layer pyramid
4. Run `git log --oneline -20` to understand recent history
5. Explore the codebase to understand architecture, patterns, and integration points relevant to the change (budget ~20% of your session on exploration)
6. Write the design to `openspec/changes/<change-name>/design.md`
7. Git commit: `openspec(<change-name>): add design`

## Design Structure

- **Context**: Background, current state, constraints, stakeholders
- **Goals / Non-Goals**: What this design achieves and explicitly excludes
- **Decisions**: Key technical choices with rationale (why X over Y?). Include alternatives considered.
- **Risks / Trade-offs**: Known limitations. Format: [Risk] -> Mitigation
- **Migration Plan**: Steps to deploy, rollback strategy (if applicable)
- **Open Questions**: Outstanding decisions or unknowns
- **Testability Notes** (REQUIRED):
  - Layer 1 (Unit): Pure logic with branching, edge cases
  - Layer 2 (Integration): Boundary contracts between layers
  - Layer 3 (E2E Network Passthrough): Full UI flows with real dev server
  - Layer 4 (E2E Local DB): RLS, triggers, data integrity

## Rules

- The proposal has been reviewed and refined — build on it confidently
- Focus on architecture and approach, not line-by-line implementation
- Good design docs explain the "why" behind technical decisions
- Reference the proposal for motivation and specs for requirements

## Done When

- `openspec/changes/<change-name>/design.md` exists with all sections including Testability Notes
- Git commit created with message `openspec(<change-name>): add design`
