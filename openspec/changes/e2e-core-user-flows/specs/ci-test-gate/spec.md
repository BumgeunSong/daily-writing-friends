## ADDED Requirements

### Requirement: Test file presence check

`.github/workflows/test-gate.yml` SHALL check PRs for test file inclusion when `src/` files are changed. This SHALL be a separate workflow from E2E execution.

#### Scenario: PR with src/ changes and no test files
- **WHEN** a PR modifies files under `src/` but includes no `.test.` or `.spec.` files in the changeset
- **THEN** the workflow SHALL add a `missing-tests` label to the PR

#### Scenario: PR with src/ changes and test files
- **WHEN** a PR modifies files under `src/` and includes at least one `.test.` or `.spec.` file
- **THEN** the workflow SHALL NOT add the `missing-tests` label
- **AND** if the label already exists, it SHALL be removed

#### Scenario: PR with no src/ changes
- **WHEN** a PR only modifies files outside `src/` (e.g., CSS, config, docs, CI workflows)
- **THEN** the workflow SHALL skip the check entirely (no label added)

### Requirement: Warning only, not blocking

The test gate SHALL NOT be a required status check. It provides visibility only.

#### Scenario: Test gate does not block merge
- **WHEN** the test gate adds a `missing-tests` label
- **THEN** the PR SHALL still be mergeable (the check is not required for merge)
