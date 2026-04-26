## ADDED Requirements

### Requirement: Post list infinite scroll

`post-list-scroll.spec.ts` SHALL verify that the post list supports infinite scroll loading. This test SHALL run in the `chromium` project only. It SHALL use globally seeded data (no write operations).

#### Scenario: Initial page load shows first page of posts
- **WHEN** an authenticated user navigates to the board
- **THEN** the first page of posts SHALL be visible (up to `PAGE_SIZE` items)

#### Scenario: Scrolling loads additional posts
- **WHEN** the user scrolls to the last visible post item using `scrollIntoViewIfNeeded()`
- **THEN** a network request for additional data SHALL be made (verified via `waitForResponse` with URL pattern predicate)
- **AND** additional posts SHALL appear below the existing ones

#### Scenario: All seeded posts are eventually visible
- **WHEN** the user scrolls enough to load all pages
- **THEN** all `PAGE_SIZE + 5` seeded posts SHALL be visible on the page
