# Session: Generate Tasks

You are an AI coding agent running in a long-running harness. This is ONE session in a multi-session pipeline. You have NO memory from previous sessions — all context comes from files on disk.

## Your Task

Generate the **tasks** artifact — an implementation checklist broken into logical groups.

## Steps

1. Read the change artifacts:
   - `openspec/changes/<change-name>/proposal.md`
   - `openspec/changes/<change-name>/design.md`
   - `openspec/changes/<change-name>/specs/` (all spec files)
2. Read `openspec/schemas/eddys-flow/schema.yaml` — find the `tasks` artifact and follow its `instruction` field
3. Read `openspec/VERIFICATION_CONFIG.md` for the project's test toolchain

4. Write the task list to `openspec/changes/<change-name>/tasks.md`
5. Git commit: `openspec(<change-name>): add tasks`

## Task Format

**CRITICAL for automation**: Each group header MUST be exactly `## N. Group Name` (e.g., `## 1. Setup`, `## 2. Core Implementation`). The `## Tests` header is also required. These headers are parsed by the harness to dispatch apply sessions — any deviation will break the pipeline.

```markdown
## 1. Group Name

- [ ] 1.1 Task description
- [ ] 1.2 Task description

## 2. Group Name

- [ ] 2.1 Task description

## Tests

### Unit
- [ ] T.1 Unit test description

### Integration
- [ ] T.2 Integration test description

### E2E
- [ ] T.3 E2E test description
```

## Critical Rules for Task Groups

Each `## N.` group will be implemented in a SEPARATE agent session. Design groups with this in mind:

- **Group by logical unit** — tasks within a group should be cohesive and implementable together
- **Order by dependency** — earlier groups should not depend on later groups
- **Right-size groups** — each group should be completable in one session (3-7 tasks)
- **Self-contained** — a group should produce a committable, testable increment
- **Tests section** is REQUIRED — every task with business logic needs a corresponding test task
- Test tasks should specify which tool runs them: Vitest, agent-browser, or Supabase local

## Rules

- Every task MUST be a checkbox: `- [ ] X.Y Task description`
- Tasks should be small enough to complete in one session
- Reference specs for WHAT to build, design for HOW
- Test tasks must specify which tool runs them: Vitest, agent-browser, or Supabase local

## Done When

- `openspec/changes/<change-name>/tasks.md` exists with numbered groups and a Tests section
- Every implementation task has a corresponding test task
- Git commit created with message `openspec(<change-name>): add tasks`
