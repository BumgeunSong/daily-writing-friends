## ADDED Requirements

### Requirement: Stats page data rendering

`stats-display.spec.ts` SHALL verify that the stats/contribution page renders data correctly based on seeded posts. This test SHALL run in the `chromium` project only. It SHALL use globally seeded data (no write operations). Stats are computed client-side from `posts.created_at` — no separate stats table exists.

#### Scenario: Stats page renders with seeded data
- **WHEN** an authenticated user navigates to the stats/contribution page
- **THEN** the page SHALL render without errors and display data elements (contribution grid, stats indicators)

#### Scenario: Streak indicator is visible
- **WHEN** the seed data includes 7 consecutive days of posts
- **THEN** a streak indicator SHALL be visible on the stats page (behavior-based: presence of indicator, not specific count)

#### Scenario: Contribution grid shows activity
- **WHEN** the seed data includes posts on specific dates
- **THEN** the contribution grid SHALL show activity markers on those dates
