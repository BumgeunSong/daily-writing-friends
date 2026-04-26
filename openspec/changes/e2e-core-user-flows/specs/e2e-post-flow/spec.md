## ADDED Requirements

### Requirement: Post write and display verification

`post-write-flow.spec.ts` SHALL verify that a user can write a post and see it appear on the board. This test SHALL run in the `chromium` project only. Test data SHALL use the `e2e-write-` prefix for isolation.

#### Scenario: Write a post and verify it appears in the board list
- **WHEN** an authenticated user navigates to the editor, writes a post with title prefixed `e2e-write-`, and submits
- **THEN** the user SHALL be redirected to the board view and the post SHALL appear in the post list

#### Scenario: Cleanup of test-created posts
- **WHEN** the test completes (pass or fail)
- **THEN** all posts with `e2e-write-` prefix SHALL be deleted via service_role API
- **AND** `beforeEach` SHALL also clean up leftover `e2e-write-` posts from previous failed runs
