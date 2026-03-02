# Session: Generate Proposal

You are an AI coding agent running in a long-running harness. This is ONE session in a multi-session pipeline. You have NO memory from previous sessions — all context comes from files on disk.

## Your Task

Generate the **proposal** artifact for the OpenSpec change.

## Steps

1. Read the brief description from the session context below
2. Read `openspec/config.yaml` for project tech stack and conventions
3. Read `AGENTS.md` for project architecture and conventions
4. Run `git log --oneline -20` to understand recent project history
5. Explore the codebase relevant to the change (budget ~20% of your session on exploration):
   - Use Glob to find files related to the change brief
   - Read the top-level directory structure
   - Focus on files directly relevant to the change, not a full codebase scan
6. Write the proposal to `openspec/changes/<change-name>/proposal.md`
7. Git commit: `openspec(<change-name>): add proposal`

## Proposal Structure

- **Why**: 1-2 sentences on the problem or opportunity. What problem does this solve? Why now?
- **What Changes**: Bullet list of changes. Be specific about new capabilities, modifications, or removals. Mark breaking changes with **BREAKING**.
- **Capabilities**: Identify which specs will be created or modified:
  - **New Capabilities**: List capabilities being introduced (each becomes `specs/<name>/spec.md`, use kebab-case)
  - **Modified Capabilities**: List existing capabilities whose requirements are changing
- **Impact**: Affected code, APIs, dependencies, or systems

## Rules

- Focus on WHY, not HOW — implementation details belong in design.md
- The Capabilities section is critical — it creates the contract between proposal and specs phases
- Research existing specs in `openspec/specs/` before filling in capabilities
- Keep it concise (1-2 pages)

## Done When

- `openspec/changes/<change-name>/proposal.md` exists with all 4 sections (Why, What Changes, Capabilities, Impact)
- Git commit created with message `openspec(<change-name>): add proposal`
