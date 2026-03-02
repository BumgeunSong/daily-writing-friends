# Session: Verify

You are an AI coding agent running in a long-running harness. This is ONE session in a multi-session pipeline. You have NO memory from previous sessions — all context comes from files on disk.

## Available Tools
You have access to: Bash, Read, Write, Edit, Glob, Grep. No sub-agent dispatch is available.
You have a limited session budget. Work efficiently.

## Harness Overrides (claude -p mode)
- Do NOT read IMPLEMENTATION_CONFIG.yaml — looper dispatch is not available
- Do NOT generate state_model.json or test_paths.json — run tests directly
- Do NOT reference dev3000 — use standard test runners only
- Fix-and-retest runs within THIS session, not via external agents

## Your Task

Execute the 4-layer test pyramid and produce a verification report. If tests fail, fix and retest.

## Steps

1. Read project context:
   - `AGENTS.md` — build commands, test commands, project conventions
   - `openspec/config.yaml` — tech stack

2. Read the change artifacts:
   - `openspec/changes/<change-name>/design.md` (Testability Notes)
   - `openspec/changes/<change-name>/specs/` (all spec files — each scenario = test case)
   - `openspec/changes/<change-name>/tasks.md` (check all implementation tasks are done)

3. Read test configuration:
   - `openspec/VERIFICATION_CONFIG.md` — tool choices (Vitest, agent-browser, etc.)
   - `openspec/VERIFICATION_WORKFLOW.md` — testing philosophy and 4-layer pyramid

4. **Execute tests layer by layer** (run layers in order):
   - **Layer 1 (Unit)**: Run with Vitest — fastest feedback first
   - **Layer 2 (Integration)**: Run only after Unit passes
   - **Layer 3 (E2E Network Passthrough)**: Run only after Integration passes. Start dev server first.
   - **Layer 4 (E2E Local DB)**: Run only after Layer 3 passes. Use Supabase local Docker.
   - If a layer fails, enter the Fix Loop (Step 5) for that layer
   - Only proceed to the next layer after the current one passes
   - If Fix Loop exhausts retries, report and stop

5. **Fix loop** (max 5 iterations per layer):
   - Diagnose the root cause of failures
   - Fix the failing code or tests
   - Add fix tasks to tasks.md if needed
   - Re-run the failing layer
   - Continue until the layer passes or 5 iterations exceeded

6. Write the verification report to `openspec/changes/<change-name>/verify_report.md`
7. Git commit: `openspec(<change-name>): add verify report`

## Report Format

For each layer:
- Status: PASS / FAIL
- Tests run / passed / failed
- For each failure: test name, expected vs actual, root cause

Include:
- List any spec requirements NOT covered by the test suite
- Overall verdict: PASS / FAIL
- If FAIL after 5 iterations: remaining failures with root cause analysis

## Done When

- `openspec/changes/<change-name>/verify_report.md` exists with all layer results
- All test layers pass, OR max iterations reached with root cause analysis
- Git commit created
