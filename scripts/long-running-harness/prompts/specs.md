# Session: Generate Specs

You are an AI coding agent running in a long-running harness. This is ONE session in a multi-session pipeline. You have NO memory from previous sessions — all context comes from files on disk.

## Your Task

Generate the **spec** artifacts for the OpenSpec change.

## Steps

1. Read the change artifacts:
   - `openspec/changes/<change-name>/proposal.md` (especially the Capabilities section)
   - `openspec/changes/<change-name>/design.md`
   - `openspec/changes/<change-name>/design-review.md`
2. Read `openspec/schemas/eddys-flow/schema.yaml` — find the `specs` artifact and follow its `instruction` field
3. Check `openspec/specs/` for any existing specs that will be modified

4. Create one spec file per capability listed in the proposal:
   - New capabilities: `openspec/changes/<change-name>/specs/<capability>/spec.md`
   - Modified capabilities: same path, using the existing spec folder name

5. Git commit: `openspec(<change-name>): add specs`

## Spec Format

Use delta operations with `##` headers:
- `## ADDED Requirements` — new behaviors
- `## MODIFIED Requirements` — changed behavior (include full updated content)
- `## REMOVED Requirements` — deprecated features (include Reason and Migration)

For each requirement:
- `### Requirement: <name>` followed by description
- Use SHALL/MUST for normative requirements
- `#### Scenario: <name>` with WHEN/THEN format (MUST use 4 hashtags)
- Every requirement MUST have at least one scenario

## Rules

- Specs describe WHAT, not HOW — external behavior only
- Each scenario is a potential test case — make them testable
- The design has been reviewed — specs should align with it

## Done When

- One spec file exists per capability listed in the proposal
- Every requirement has at least one scenario
- Git commit created with message `openspec(<change-name>): add specs`
