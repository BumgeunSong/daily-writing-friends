## ADDED Requirements

### Requirement: Email-OTP signup confirmation

The system SHALL confirm email/password signups using a 6-digit one-time password delivered to the user's email address. The system SHALL NOT rely on a magic-link URL for confirmation, because corporate email gateways may strip outbound links.

#### Scenario: New user receives a 6-digit code in email

- **WHEN** a user submits valid email and password on `/signup`
- **THEN** Supabase SHALL queue a confirmation email containing a 6-digit numeric code
- **AND** the system SHALL navigate the user to `/verify-email`
- **AND** the email body SHALL NOT contain a confirmation URL

#### Scenario: User confirms with correct code

- **WHEN** the user enters the correct 6-digit code on `/verify-email`
- **THEN** Supabase SHALL establish an authenticated session
- **AND** the system SHALL navigate the user to `/join/onboarding`

#### Scenario: User enters wrong code

- **WHEN** the user enters an incorrect 6-digit code on `/verify-email`
- **THEN** the system SHALL display an inline error in Korean
- **AND** the input SHALL remain editable so the user can retry

#### Scenario: Code expires after 1 hour

- **WHEN** the user enters a code older than `otp_expiry` (3600 seconds)
- **THEN** the system SHALL display "인증 코드가 만료되었습니다. 다시 받기를 눌러주세요."
- **AND** the Resend button SHALL be enabled

#### Scenario: Resend cooldown

- **WHEN** the user clicks Resend
- **THEN** the system SHALL call `resendVerificationEmail(email)` once
- **AND** the Resend button SHALL display a countdown for 30 seconds before becoming clickable again

#### Scenario: Rate-limit lockout

- **WHEN** Supabase returns a rate-limit error code on verification
- **THEN** the system SHALL display the `locked` state with copy "인증 시도가 너무 많습니다. 잠시 후 다시 시도해주세요. (최대 1시간)"
- **AND** the Resend button SHALL be disabled
- **AND** a recovery hint with the support contact SHALL be visible

### Requirement: Persona B (already-registered email) routes to login + add-login-method

When a user attempts email/password signup for an address that already has any identity in `auth.users`, Supabase returns `user_already_exists` (HTTP 422) and queues no confirmation email. The system SHALL detect this and surface a clear inline error guiding the user to log in with their existing identity (e.g., Google) and add a password via Settings — NOT route them to `/verify-email`, which would have no token to verify.

This requirement supersedes the original "auto-link banner" design once the 2026-05-05 spike confirmed that `verifyOtp({ type: 'signup' })` does not link a new password identity to an existing Google identity. See `docs/plans/2026-05-05-otp-spike-report.md` F1–F3.

#### Scenario: Persona B sees inline guidance instead of being routed to verify-email

- **WHEN** `signUpWithEmail` throws an "already registered" error
- **THEN** `SignupPage` SHALL display an inline Korean error: "이미 가입된 이메일입니다. 구글로 로그인 후 [설정 > 로그인 수단 추가]에서 비밀번호를 설정해주세요."
- **AND** SHALL NOT navigate to `/verify-email`
- **AND** SHALL keep the form usable for the user to retry with a different email

#### Scenario: Plain new email signup arrives at onboarding

- **WHEN** `verifyOtpForSignup` returns `{ ok: true; providers }` for a fresh email
- **THEN** the system SHALL display a brief success indicator
- **AND** SHALL navigate the user immediately to `/join/onboarding`

### Requirement: Onboarding page collects profile and cohort signup in one step

The system SHALL render `/join/onboarding` as a single page that captures real name, nickname, contact information, optional referrer, and cohort signup, and SHALL persist this data in a single submit action.

#### Scenario: User fills all required fields and submits with active cohort

- **WHEN** a user submits the onboarding form with valid `realName`, `nickname`, contact value, and an `upcomingBoard` exists
- **THEN** the system SHALL update the `users` row with `onboarding_complete = true`, the contact fields, and the profile fields
- **AND** SHALL add the user's `uid` to `board_waiting_users` for the upcoming `boardId`
- **AND** SHALL navigate to `/join/complete` with `name` and `cohort` in route state

#### Scenario: User submits with no upcoming cohort

- **WHEN** a user submits the onboarding form and `upcomingBoard` is null
- **THEN** the system SHALL update the `users` row with `onboarding_complete = true` and the profile fields
- **AND** SHALL NOT call `addUserToBoardWaitingList`
- **AND** SHALL navigate to `/boards`

#### Scenario: User already on waiting list lands on onboarding

- **WHEN** the user navigates to `/join/onboarding` and `useIsUserInWaitingList` returns true
- **THEN** the system SHALL redirect to `/boards` immediately

#### Scenario: Pre-filled fields from existing data

- **WHEN** the onboarding page mounts and `fetchUser(uid)` returns a row with any non-null fields
- **THEN** the form SHALL pre-fill those fields
- **AND** required fields SHALL still validate before submit

### Requirement: Contact info accepts phone OR Kakao ID

The system SHALL collect either a phone number OR a Kakao ID per user. The system SHALL NOT require both. The system SHALL persist `null` for the unselected option.

#### Scenario: User submits with phone tab active

- **WHEN** the user submits with `activeContactTab === 'phone'` and a valid phone value
- **THEN** the persisted row SHALL have `phone_number` set to the digits-only string
- **AND** `kakao_id` SHALL be set to `null`

#### Scenario: User submits with Kakao tab active

- **WHEN** the user submits with `activeContactTab === 'kakao'` and a valid Kakao ID
- **THEN** the persisted row SHALL have `kakao_id` set to the trimmed string
- **AND** `phone_number` SHALL be set to `null`

#### Scenario: Tab switching does not lose user input

- **WHEN** the user types a value in one tab, switches to the other tab, then switches back
- **THEN** the original input value SHALL still be present in the form

#### Scenario: Phone validation rejects under 10 digits

- **WHEN** the user submits with `activeContactTab === 'phone'` and the digits-only phone value has fewer than 10 characters
- **THEN** the form SHALL block submission with a Korean error message
- **AND** SHALL NOT call `updateUser`

#### Scenario: Kakao ID rejects empty string

- **WHEN** the user submits with `activeContactTab === 'kakao'` and the Kakao ID is empty after trim
- **THEN** the form SHALL block submission with a Korean error message
- **AND** SHALL NOT call `updateUser`

#### Scenario: Kakao ID rejects forbidden characters at DB level

- **WHEN** any client attempts to write `kakao_id` containing characters outside `[A-Za-z0-9._-]` or longer than 50 characters
- **THEN** the database CHECK constraint `users_kakao_id_format` SHALL reject the row

### Requirement: Database enforces contact info when onboarded

The database SHALL enforce that any row with `onboarding_complete = true` has at least one of `phone_number` or `kakao_id` populated.

#### Scenario: CHECK constraint rejects onboarded row without contact

- **WHEN** any client attempts to set `onboarding_complete = true` on a row where both `phone_number IS NULL` AND `kakao_id IS NULL`
- **THEN** the constraint `users_contact_required_when_onboarded` SHALL reject the write

#### Scenario: CHECK constraint allows non-onboarded rows without contact

- **WHEN** a row has `onboarding_complete = false` and both contact fields are null
- **THEN** the constraint SHALL accept that row

### Requirement: Backfill marks pre-existing onboarded users

The migration SHALL set `onboarding_complete = true` for users who, prior to the migration, demonstrated they had completed onboarding by having board permission, an existing waiting-list row, or a populated phone number.

#### Scenario: User with board permission is marked complete

- **WHEN** the backfill runs and a user has at least one row in `user_board_permissions`
- **THEN** that user's `onboarding_complete` SHALL be `true` after the migration

#### Scenario: User in any waiting list is marked complete

- **WHEN** the backfill runs and a user has at least one row in `board_waiting_users`
- **THEN** that user's `onboarding_complete` SHALL be `true` after the migration

#### Scenario: User with phone_number is marked complete

- **WHEN** the backfill runs and a user has `phone_number IS NOT NULL`
- **THEN** that user's `onboarding_complete` SHALL be `true` after the migration

#### Scenario: User with no signal stays incomplete

- **WHEN** the backfill runs and a user has no board permission, no waiting-list row, and `phone_number IS NULL`
- **THEN** that user's `onboarding_complete` SHALL be `false` after the migration

### Requirement: Post-login routing respects onboarding_complete

The `RootRedirect` SHALL route logged-in users without `onboarding_complete = true` to `/join/onboarding` regardless of auth provider.

#### Scenario: New email user lands at root after OTP

- **WHEN** a logged-in user lands at `/` with `onboarding_complete = false`, not active, not in waiting list
- **THEN** `RootRedirect` SHALL navigate to `/join/onboarding`

#### Scenario: Returning Google user without onboarding lands at root

- **WHEN** a Google-OAuth user lands at `/` with `onboarding_complete = false`, not active, not in waiting list
- **THEN** `RootRedirect` SHALL navigate to `/join/onboarding`

#### Scenario: Active user lands on boards

- **WHEN** a logged-in user lands at `/` and `useIsCurrentUserActive` returns true
- **THEN** `RootRedirect` SHALL navigate to `/boards`

#### Scenario: Waiting-list user lands on boards (no inline JoinComplete)

- **WHEN** a logged-in user lands at `/`, is not active, and `useIsUserInWaitingList` returns true
- **THEN** `RootRedirect` SHALL navigate to `/boards`
- **AND** SHALL NOT render `JoinCompletePage` inline

#### Scenario: Onboarded user without cohort lands on join intro

- **WHEN** a logged-in user lands at `/` with `onboarding_complete = true`, not active, not in waiting list
- **THEN** `RootRedirect` SHALL navigate to `/join`

### Requirement: Cohort-signup dispatcher routes by user state

The system SHALL keep `/join/form` as the universal "start cohort signup" entry point. The dispatcher component SHALL route the user to the correct destination based on their current state.

#### Scenario: Active user uses dispatcher

- **WHEN** a user navigates to `/join/form` and `useIsCurrentUserActive` returns true
- **THEN** the dispatcher SHALL replace the route with `/join/form/active-user`

#### Scenario: Waiting-list user uses dispatcher

- **WHEN** a user navigates to `/join/form` and `useIsUserInWaitingList` returns true
- **THEN** the dispatcher SHALL replace the route with `/boards`

#### Scenario: Not-onboarded user uses dispatcher

- **WHEN** a user navigates to `/join/form` and `onboarding_complete` is false
- **THEN** the dispatcher SHALL replace the route with `/join/onboarding`

#### Scenario: Onboarded but inactive non-waitlist user uses dispatcher

- **WHEN** a user navigates to `/join/form` with `onboarding_complete = true`, not active, not in waiting list
- **THEN** the dispatcher SHALL replace the route with `/join/onboarding`

### Requirement: Submit completion page is its own route

The system SHALL render the join-complete confirmation as a route at `/join/complete`, reachable only by post-submit navigation from `/join/onboarding`.

#### Scenario: Submit success navigates to complete

- **WHEN** the onboarding submit succeeds with cohort name and number in route state
- **THEN** the system SHALL navigate to `/join/complete`
- **AND** the page SHALL render the user's name and cohort number from route state

#### Scenario: Direct navigation falls back gracefully

- **WHEN** a user navigates directly to `/join/complete` without route state
- **THEN** the page SHALL render with empty `name` and `cohort = 0` placeholders, OR redirect to `/boards`

### Requirement: Verification spike precedes implementation

A documented verification spike SHALL be completed against local Supabase before any UI rewrite begins. The spike's outcome SHALL determine the implementation strategy for auto-link, error-shape mapping, and session-binding.

#### Scenario: Spike documents auto-link behavior

- **WHEN** the spike runs steps 1–4 from design.md D1
- **THEN** the spike report SHALL contain: actual `signUp` response shape for already-registered email; actual `verifyOtp` outcome and `data.user.identities` array; actual session-binding result across browsers; the canonical `error` shape table for expired / rate-limit / invalid-token cases

#### Scenario: Spike result branches implementation

- **WHEN** the spike report shows that `verifyOtp` does not auto-link
- **THEN** the implementation SHALL add a `signInWithOtp` fallback path or abort the auto-link strand per design.md D1 implementation branches

#### Scenario: Spike result determines session-binding mitigation

- **WHEN** the spike report shows that an OTP issued in browser A is redeemable in browser B
- **THEN** the implementation SHALL add a "Did you initiate this signup?" confirmation step on `/verify-email` before completing verification
