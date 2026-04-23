# Spec: topic-presenter-banner

## ADDED Requirements

### Requirement: Banner Visibility Condition

The board page SHALL display a presenter banner whenever at least one `topic_missions` entry for the board has `status = 'assigned'`. The banner SHALL NOT be shown when no assigned presenter exists. The banner SHALL be displayed event-driven (based on the presence of an `assigned` entry), not on a day-of-week or time schedule.

#### Scenario: Banner is shown when presenter is assigned

WHEN a board member views a board page and a `topic_missions` entry with `status = 'assigned'` exists for that board
THEN the presenter banner is displayed on the board page

#### Scenario: Banner is hidden when no presenter is assigned

WHEN a board member views a board page and no `topic_missions` entry with `status = 'assigned'` exists for that board
THEN the presenter banner is not rendered

---

### Requirement: Banner Content for Non-Presenter Members

For authenticated members who are NOT the currently assigned presenter, the banner SHALL display:
- The assigned presenter's name (nickname)
- The registered topic of the assigned presenter
- A link to the topic registration page (`/board/:boardId/topic`) if the viewing member does NOT yet have a `topic_missions` entry for this board

#### Scenario: Non-presenter member without registration sees registration link

WHEN a board member who is NOT the assigned presenter AND has no entry in `topic_missions` for the board views the board page
THEN the banner shows the presenter's name and topic
AND includes a link labeled "발표 주제 등록하기" pointing to `/board/:boardId/topic`

#### Scenario: Non-presenter member who is already registered sees no registration link

WHEN a board member who is NOT the assigned presenter AND already has an entry in `topic_missions` for the board views the board page
THEN the banner shows the presenter's name and topic
AND does NOT include a registration link

---

### Requirement: Banner Content for the Assigned Presenter

When the viewing user IS the currently assigned presenter, the banner SHALL display a personalized message distinguishing them from the generic view (e.g., "당신이 다음 발표자입니다"). The banner SHALL display their own registered topic.

#### Scenario: Assigned presenter sees personalized banner

WHEN the authenticated user viewing the board page is the currently assigned presenter
THEN the banner shows a message indicating the viewer is the next presenter
AND displays their registered topic

---

### Requirement: Banner Placement on Board Page

The presenter banner SHALL be rendered on the board page below the board header and above the post list. It SHALL be implemented as a standalone component (`PresenterBanner`) that receives `boardId` as a prop and fetches its own data.

#### Scenario: Banner renders in correct position

WHEN a board page is displayed with an assigned presenter
THEN the PresenterBanner component appears below the board header and above the post list

#### Scenario: Absent banner does not affect layout

WHEN no presenter is assigned and the banner is not rendered
THEN the board header and post list display without a gap or placeholder
