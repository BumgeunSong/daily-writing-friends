# Session: Verify

You are an AI coding agent running in a long-running harness. This is ONE session in a multi-session pipeline. You have NO memory from previous sessions — all context comes from files on disk.

## Available Tools
You have access to: Bash, Read, Write, Edit, Glob, Grep. No sub-agent dispatch is available.
You have a limited session budget. Work efficiently.

## Harness Overrides (claude -p mode)
- Do NOT read IMPLEMENTATION_CONFIG.yaml — looper dispatch is not available
- Fix-and-retest runs within THIS session, not via external agents

## Your Task

Execute the 4-layer test pyramid and produce a verification report. If tests fail, fix and retest.

## Scope Guidance
- **Prefer test-file fixes.** If a test fails due to a test-level issue (wrong assertion, missing mock, fixture error), fix the test file.
- **Source-level bugs → document, don't fix.** If a test fails due to a source-level bug in `src/`, document the root cause in verify_report.md and mark verdict FAIL. Do not implement substantial source changes — that is the apply phase's job.
- **Exception: trivial source fixes** (< 5 lines, e.g., typo, off-by-one, missing import) are allowed but MUST be documented in the verify report.

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

3.5. **E2E Environment Setup** (before Layer 3):
   - Start dev server: `npm run dev &` (background, wait for port 3000)
   - Verify agent-browser is available: `command -v agent-browser`
   - Start dev3000 if available: `command -v dev3000 && dev3000 &`
   - If any tool is unavailable, attempt to install or report blocker in verify_report.md
   - Reference `VERIFICATION_WORKFLOW.md` for the full MBT process
   - Reference `VERIFICATION_CONFIG.md` for tool choices

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

## Cleanup (before exiting)
- Kill dev server: `lsof -ti:3000 | xargs kill 2>/dev/null || true`
- Kill dev3000: `lsof -ti:3001 | xargs kill 2>/dev/null || true`
- This prevents zombie processes and port conflicts on verify retry.

## Done When

- `openspec/changes/<change-name>/verify_report.md` exists with all layer results
- All test layers pass, OR max iterations reached with root cause analysis
- Git commit created
