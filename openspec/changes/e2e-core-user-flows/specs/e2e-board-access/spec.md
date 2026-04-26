## ADDED Requirements

### Requirement: Non-member board access blocked

`board-access.non-member.spec.ts` SHALL verify that a user without board membership cannot access a board. This test SHALL run in the `chromium-non-member` Playwright project using `storageState.non-member.json` (authenticated as e2e2@ who has no board membership).

#### Scenario: Non-member navigates to board URL
- **WHEN** a user authenticated as e2e2@ (no board membership) navigates to the board page URL
- **THEN** an error page SHALL be displayed (not a blank page, not the board content)

#### Scenario: Non-member auth setup
- **WHEN** `auth.setup.ts` runs
- **THEN** it SHALL authenticate both e2e@ (member) and e2e2@ (non-member) and save their auth states to separate files (`storageState.auth.json` and `storageState.non-member.json`)

### Requirement: Playwright project configuration

A new `chromium-non-member` project SHALL be added to `playwright.config.ts`.

#### Scenario: Project matches non-member spec files
- **WHEN** Playwright runs
- **THEN** the `chromium-non-member` project SHALL use `storageState.non-member.json` and match `*.non-member.spec.ts` files
- **AND** it SHALL depend on the `setup` project
