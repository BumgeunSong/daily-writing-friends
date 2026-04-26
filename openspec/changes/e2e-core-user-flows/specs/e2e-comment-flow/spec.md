## ADDED Requirements

### Requirement: Comment write and display verification

`comment-flow.spec.ts` SHALL verify that a user can write a comment on a post and see it displayed. This test SHALL run in the `chromium` project only. Test data SHALL use the `e2e-write-` prefix for isolation.

#### Scenario: Write a comment and verify it appears
- **WHEN** an authenticated user navigates to a seeded post's detail page, writes a comment with content prefixed `e2e-write-`, and submits
- **THEN** the comment SHALL appear in the comment section of the post without page reload

#### Scenario: Cleanup of test-created comments
- **WHEN** the test completes (pass or fail)
- **THEN** all comments with `e2e-write-` prefix SHALL be deleted via service_role API
- **AND** `beforeEach` SHALL also clean up leftover `e2e-write-` comments from previous failed runs
