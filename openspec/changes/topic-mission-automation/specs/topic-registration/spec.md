# Spec: topic-registration

## ADDED Requirements

### Requirement: Topic Registration Page Route

The system SHALL provide a topic registration page accessible at `/board/:boardId/topic`. The page SHALL only be accessible to authenticated users who are members of the specified board. Unauthenticated users SHALL be redirected to the login page. Non-members SHALL be redirected or shown an access-denied state.

#### Scenario: Board member accesses registration page

WHEN an authenticated board member navigates to `/board/:boardId/topic`
THEN the topic registration form is displayed

#### Scenario: Unauthenticated user is redirected

WHEN an unauthenticated user navigates to `/board/:boardId/topic`
THEN the user is redirected to the login page

#### Scenario: Non-member cannot access registration page

WHEN an authenticated user who is NOT a member of the board navigates to `/board/:boardId/topic`
THEN the user is shown an access-denied state or redirected

---

### Requirement: Topic Submission Form

The registration page SHALL display a form with a text input for the topic and a submit button. The form SHALL validate that the topic is between 1 and 200 characters before submission. The form SHALL disable the submit button or show an inline error when validation fails.

#### Scenario: Valid topic is submitted

WHEN a board member submits a topic string between 1 and 200 characters
THEN the entry is created in the `topic_missions` table with `status = 'pending'`
AND the page displays a success confirmation message

#### Scenario: Empty topic is rejected client-side

WHEN a board member attempts to submit an empty topic
THEN the form shows a validation error and does not submit

#### Scenario: Topic exceeding 200 characters is rejected client-side

WHEN a board member types a topic longer than 200 characters and attempts to submit
THEN the form shows a validation error and does not submit

---

### Requirement: Duplicate Registration Prevention

The system SHALL prevent a board member from registering more than once per board. Before or during submission, the system SHALL detect an existing queue entry for the current user and board.

If an entry already exists, the page SHALL display an informational message indicating the member is already registered, and SHALL NOT show the submission form.

#### Scenario: Already-registered member sees info state

WHEN a board member who has already registered navigates to `/board/:boardId/topic`
THEN no submission form is shown
AND an informational message indicates they are already in the queue

#### Scenario: Duplicate submission returns error

WHEN a board member submits a registration and the DB unique constraint is violated (e.g., concurrent submission)
THEN the API layer returns a user-friendly error message
AND the form remains interactive for retry

---

### Requirement: Registration Required Before Assignment

A board member SHALL NOT be assignable as presenter unless they have an entry in the `topic_missions` table for the board. The queue advancement operation SHALL only select from members who have registered (i.e., have a `pending` entry).

#### Scenario: Unregistered member is skipped during advancement

WHEN the admin advances the queue
THEN only members with a `pending` entry in `topic_missions` are eligible for assignment
AND members with no entry are not assigned

---

### Requirement: Post-Registration Confirmation

After a successful topic registration, the page SHALL display a confirmation state showing the submitted topic and indicating the member's position is in the queue. A navigation affordance SHALL allow the member to return to the board page.

#### Scenario: Confirmation shows submitted topic

WHEN a topic registration succeeds
THEN the page displays the topic text that was submitted
AND a link or button to navigate back to the board page is visible
