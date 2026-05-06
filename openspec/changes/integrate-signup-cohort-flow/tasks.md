## 0. Verification Spike (must complete before any UI work)

- [x] 0.1 Boot local Supabase Docker; pre-create a Google-OAuth user via the seed or admin UI
- [x] 0.2 In a fresh browser session, call `signUpWithEmail` (current code, OR a temporary harness) for the same email; capture the response shape including any error
- [x] 0.3 Read the most recent Inbucket message; copy the OTP token
- [x] 0.4 In the **same** browser session, call `supabase.auth.verifyOtp({ email, token, type: 'signup' })`; capture `data.user.identities` and session metadata
- [x] 0.5 Open a **second** browser (different localStorage/cookies) and try `verifyOtp` with the same token; document whether it succeeds (session-binding test)
- [x] 0.6 Reproduce the rate-limit error: hit `verifyOtp` with wrong tokens repeatedly; capture the exact `error.code`, `error.message`, `error.status`
- [x] 0.7 Reproduce the expired-token error: wait > 1 hour OR manually invalidate; capture exact error shape
- [x] 0.8 Write a short spike report to `docs/plans/2026-05-05-otp-spike-report.md` with all findings; pin the canonical Supabase error-code mapping table; declare whether to follow design D1 happy path or fallback branch

## 1. E2E Tooling Prerequisite

- [x] 1.1 Search `tests/e2e/` for any existing Inbucket parser; if none, create `tests/e2e/utils/inbucket.ts` exposing `readLatestOtpForEmail(email: string): Promise<string>` that polls `http://127.0.0.1:54324/api/v1/mailbox/<email>/messages` and extracts the 6-digit token
- [x] 1.2 Smoke-test the helper against a manual local signup

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/20260506000000_add_onboarding_complete_and_kakao_id.sql` with operations 1–5 from design.md D6 (column adds, kakao_id format CHECK, backfill, NOT VALID + VALIDATE for the contact-required CHECK). Note: timestamp prefix moved from `20260505000000` → `20260506000000` during PR CI to avoid `schema_migrations.version` collision with `20260505000000_donations.sql` on main.
- [x] 2.2 Run `supabase db reset` locally; confirm the migration applies cleanly; verify `\d users` shows both new columns and both constraints
- [x] 2.3 Seed a few rows in different states (active / waiting-list / phone-only / nothing) and assert backfill outcomes match the four scenarios in spec.md "Backfill marks pre-existing onboarded users"

## 3. Supabase Email Template + Local Config

- [x] 3.1 Create `supabase/templates/confirmation.html` — Korean OTP body using `{{ .Token }}`, no `{{ .ConfirmationURL }}`
- [x] 3.2 Edit `supabase/config.toml` to set `[auth.email] enable_confirmations = true` and add `[auth.email.template.confirmation] subject = ... content_path = ...`
- [x] 3.3 `supabase stop && supabase start`; sign up via curl or a small harness; confirm the Inbucket message body shows the 6-digit code

## 4. Type / Mapper / Select Updates

- [x] 4.1 `apps/web/src/user/model/User.ts`: add `kakaoId: string | null` and `onboardingComplete: boolean` to `User`, `UserOptionalFields`, and `UserRequiredFields` (place them where they belong logically)
- [x] 4.2 `apps/web/src/user/utils/userMappers.ts`: extend `SupabaseUserUpdate` with `kakao_id?: string | null; onboarding_complete?: boolean;`; add the camel→snake mappings to `mapUserToSupabaseUpdate`
- [x] 4.3 `apps/web/src/shared/api/supabaseReads.ts`: extend the `select(...)` column list in `fetchUserFromSupabase` (and any sibling helpers) with `kakao_id, onboarding_complete`; add the mapping back in the row-to-User conversion

## 5. Routing Constants and Router

- [x] 5.1 `apps/web/src/login/constants.ts`: add `ROUTES.ONBOARDING = '/join/onboarding'` and `ROUTES.JOIN_COMPLETE = '/join/complete'`
- [x] 5.2 `apps/web/src/router.tsx`: add `{ path: 'join/onboarding', element: <OnboardingPage /> }` and `{ path: 'join/complete', element: <JoinCompletePage /> }` under `privateRoutesWithoutNav`; remove the `join/form/new-user` entry; keep `join/form` and `join/form/active-user`

## 6. Pure Helpers

- [x] 6.1 Create `apps/web/src/login/utils/contactValidation.ts` exporting `validatePhone(input: string): string | null` and `validateKakaoId(input: string): string | null` per design D5/D8
- [x] 6.2 Create `apps/web/src/login/utils/verifyEmailState.ts` exporting types `VerifyOtpOutcome`, `VerifyState`, and the pure function `decideVerifySuccessState(outcome: VerifyOtpOutcome): VerifyState` per design D5
- [x] 6.3 Create `apps/web/src/login/utils/onboardingSubmit.ts` exporting types `OnboardingFormValues`, `OnboardingSubmitContext`, `OnboardingSubmitAction`, and the pure function `resolveOnboardingSubmit(values, ctx): OnboardingSubmitAction` per design D3
- [x] 6.4 `apps/web/src/shared/auth/supabaseAuth.ts`: add `classifySupabaseAuthError(err): VerifyOtpOutcome['errorCode']` using the canonical mapping table from spike report 0.8

## 7. Auth Helper Updates

- [x] 7.1 `apps/web/src/shared/auth/supabaseAuth.ts`: drop `emailRedirectTo` from `signUpWithEmail`'s `options` (OTP flow doesn't need it)
- [x] 7.2 `apps/web/src/shared/auth/supabaseAuth.ts`: add `verifyOtpForSignup(email: string, token: string): Promise<VerifyOtpOutcome>` per design D9 — wrapper only, no decision logic

## 8. Routing Decision Update

- [x] 8.1 `apps/web/src/shared/utils/routingDecisions.ts`: extend `RootRedirectInput` with `onboardingComplete: boolean`; remove the `joinComplete` variant from `RootRedirectResult`; add the new branches per design D2 — waiting-list users go to `/boards`, not-onboarded users go to `/join/onboarding`
- [x] 8.2 `apps/web/src/shared/utils/routingDecisions.test.ts`: replace deleted `joinComplete` test cases with new branches; add coverage for all paths in spec.md "Post-login routing respects onboarding_complete"
- [x] 8.3 Create new hook `apps/web/src/login/hooks/useOnboardingComplete.ts` — reads `users.onboarding_complete` for the given uid using the existing `fetchUser` infrastructure (or a narrower select)
- [x] 8.4 `apps/web/src/shared/components/auth/RootRedirect.tsx`: thread the new hook output into `resolveRootRedirect`; remove the `useUserNickname` import (no longer used here); remove the inline `<JoinCompletePage />` render branch

## 9. JoinDispatcher (Rename + Logic)

- [x] 9.1 Rename `apps/web/src/login/components/JoinFormPageForActiveOrNewUser.tsx` → `JoinDispatcher.tsx`; update the export name and the `router.tsx` import
- [x] 9.2 Inside `JoinDispatcher`, add the four-branch routing per spec.md "Cohort-signup dispatcher routes by user state": active → `/join/form/active-user`, in-waiting-list → `/boards`, else → `/join/onboarding`. Use `useOnboardingComplete`, `useIsCurrentUserActive`, `useIsUserInWaitingList`. Keep the existing skeleton UI as the loading fallback

## 10. OnboardingPage

- [x] 10.1 Create `apps/web/src/login/components/OnboardingPage.tsx` with the form structure from design D3 (real_name, nickname, contact-tab segmented control, referrer, cohort card)
- [x] 10.2 Wire submit through `resolveOnboardingSubmit` (pure) → `updateUser` + optional `addUserToBoardWaitingList` (effects) → `navigate`
- [x] 10.3 Implement the contact-tab segmented control: keep both phone and kakao values in form state, render only the active tab's input, validate only the active tab via Zod refine
- [x] 10.4 Pre-fill from `fetchUser(uid)` if any field exists; redirect to `/boards` immediately if `useIsUserInWaitingList` returns true
- [x] 10.5 Apply project design tokens: consult `daily-writing-friends-design` skill; ensure dark-mode parity, button hierarchy, and accessibility

## 11. VerifyEmailPage Rewrite

- [x] 11.1 Replace the "check inbox" UI in `apps/web/src/login/components/VerifyEmailPage.tsx` with a 6-digit OTP input + Resend button
- [x] 11.2 Wire submit through `verifyOtpForSignup` → `decideVerifySuccessState` → render the `VerifyState` per design D5: `entry`, `success`, `success-linked`, `locked`, `error-inline`
- [x] 11.3 ~~`success-linked` UI~~ **DROPPED per spike F1–F3**: Supabase doesn't auto-link a new password to an existing Google identity. SignupPage now redirects already-registered users with an inline error pointing to /login + /settings/add-login-method.
- [x] 11.4 `locked` UI: disable Resend, show recovery copy with support contact
- [x] 11.5 Keep the existing email-from-route-state + sessionStorage fallback for refresh resilience

## 12. JoinCompletePage Route Promotion

- [x] 12.1 Remove inline render of `<JoinCompletePage />` from any caller (`RootRedirect.tsx`, deleted `JoinFormPageForNewUser.tsx`); keep the component as a route-rendered page
- [x] 12.2 Update `JoinCompletePage` to read `name` and `cohort` from `useLocation().state` instead of props; provide a graceful empty fallback if state is absent (per spec.md "Direct navigation falls back gracefully")

## 13. Delete Removed Files

- [x] 13.1 Delete `apps/web/src/login/components/JoinFormPageForNewUser.tsx`
- [x] 13.2 Delete `apps/web/src/login/components/JoinFormCardForNewUser.tsx`
- [x] 13.3 Delete the `JoinFormDataForNewUser` type from `apps/web/src/login/model/join.ts` (leave the file if other types remain)
- [x] 13.4 Verify `JoinFormHeader.tsx` is still imported by `JoinFormPageForActiveUser.tsx`; do NOT delete it

## 14. Production Canary Script

- [x] 14.1 Create `scripts/canary-verify-otp-template.ts` that signs up `dwf-canary+<timestamp>@<allowed-domain>`, polls Inbucket (or the configured target inbox), and asserts the body contains a 6-digit token; exits non-zero on failure
- [x] 14.2 Add an npm script (`canary:otp`) so the release-checklist run is one command; document the manual production-dashboard step in the script's header comment

## 15. Deploy Checklist (manual, run by engineer at merge time — DEFERRED to merge author)

- [ ] 15.1 Update production Supabase dashboard email template: replace magic-link content with OTP body using `{{ .Token }}`. Match the local `supabase/templates/confirmation.html`
- [ ] 15.2 Run `npm run canary:otp` against production with a sentinel email; verify a 6-digit code arrives
- [ ] 15.3 Apply the migration via `supabase db push` against production
- [ ] 15.4 Spot-check backfill numbers on production (`SELECT count(*) FROM users WHERE onboarding_complete = true`) match staging expectations
- [ ] 15.5 Merge / deploy the application code

## Tests

### Unit (Vitest)

- [x] T.1 `routingDecisions.test.ts`: extend with all scenarios from spec.md "Post-login routing respects onboarding_complete" (5 scenarios). Remove obsolete `joinComplete`-result tests
- [x] T.2 `verifyEmailState.test.ts`: cover all 6 transitions in `decideVerifySuccessState` (success, success-linked, locked, expired, invalid_token, unknown)
- [x] T.3 `onboardingSubmit.test.ts`: cover all 4 input combinations of `resolveOnboardingSubmit` (cohort exists/null × phone tab/kakao tab) plus the boundary cases (empty referrer, pre-filled values)
- [x] T.4 `contactValidation.test.ts`: cover phone validation (9, 10, 11, 12 digits, mixed punctuation `010-1234-5678`, leading/trailing whitespace) and kakao validation (empty, whitespace-only, 50-char, 51-char, valid id-with_dots.allowed.chars-)
- [x] T.5 `supabaseAuth.test.ts`: cover `classifySupabaseAuthError` with fixtures derived from spike report (rate_limit, expired, invalid_token, unknown)
- [x] T.6 `userMappers.test.ts`: extend (or add) mapping tests for `kakaoId → kakao_id` and `onboardingComplete → onboarding_complete`

### Integration (Vitest + RTL)

- [x] T.7 `VerifyEmailPage.test.tsx`: drive the component through each `VerifyState` by stubbing the `verifyOtpForSignup` return; assert the rendered copy and button states match D5

### E2E Local DB (agent-browser + Supabase local Docker)

- [x] T.8 `tests/e2e/otp-signup-happy-path.spec.ts`: sign up new email/password → read OTP from Inbucket via `readLatestOtpForEmail` helper → enter on `/verify-email` → land on `/join/onboarding`. Capture dev3000 timeline for any unexpected redirects
- [x] T.9 ~~auto-link e2e~~ **SKIPPED per spike F1–F3** — auto-link does not work; the test scenario is not realizable. Replaced by `SignupPage` inline-error coverage exercised manually via the spike (signUp returns 422 user_already_exists; UI shows inline error pointing to /settings/add-login-method).
- [x] T.10 `tests/e2e/migration-check-constraint.sql.test.ts` (or shell-driven SQL test): assert that `UPDATE users SET onboarding_complete = true WHERE id = '<row with no contact>'` raises `users_contact_required_when_onboarded` violation; assert valid path succeeds
- [x] T.11 SQL test for backfill correctness against a seeded dataset: 4 fixture rows mirroring spec.md scenarios; assert exactly the expected rows have `onboarding_complete = true` after running the migration on a fresh DB
- [x] T.12 SQL test for `kakao_id` format CHECK: `UPDATE users SET kakao_id = '<script>'` rejected; `UPDATE users SET kakao_id = 'valid_id-123'` succeeds
