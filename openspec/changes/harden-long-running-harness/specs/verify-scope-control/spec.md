## ADDED Requirements

### Requirement: Verify prompt prefers test-file modifications

The verify session prompt MUST instruct the agent to prefer test-file fixes and report FAIL with root cause for source-level bugs.

#### Scenario: Test file needs fixing
- **WHEN** a test fails due to a test-level issue (wrong assertion, missing mock, fixture error)
- **THEN** the verify agent fixes the test file and re-runs

#### Scenario: Source file has a bug
- **WHEN** a test fails due to a source-level bug in `src/`
- **THEN** the verify agent documents the root cause in `verify_report.md` and marks verdict as FAIL rather than implementing substantial source changes

#### Scenario: Minor source fix
- **WHEN** a test fails due to a trivial source issue (typo, off-by-one, missing import)
- **THEN** the verify agent MAY fix it if the change is under 5 lines, but MUST document it in the verify report

### Requirement: Verify runs E2E tests with agent-browser and dev3000

The verify session MUST execute E2E test layers (Layers 3-4) using `agent-browser` for browser automation and `dev3000` for timeline capture, as defined in `VERIFICATION_WORKFLOW.md`.

#### Scenario: E2E environment setup
- **WHEN** the verify session reaches Layer 3 (E2E Network Passthrough)
- **THEN** the agent starts the dev server, starts dev3000, and verifies `agent-browser` is available before running E2E tests

#### Scenario: Environment not ready
- **WHEN** the dev server, agent-browser, or dev3000 is not available
- **THEN** the agent attempts to set up the environment (install, start, configure) and retries. If setup fails, reports the blocker in verify_report.md

#### Scenario: E2E failure diagnosis
- **WHEN** an E2E test fails
- **THEN** dev3000 timeline is referenced for root cause analysis in verify_report.md
