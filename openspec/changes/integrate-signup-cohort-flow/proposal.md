## Why

First-time users currently traverse two disjoint funnels — auth signup at `/signup` and cohort join at `/join/form` — with no automatic handoff between them. A user who creates an account can land on `/boards` with no profile and no cohort, leaving them in limbo. Email confirmation also relies on magic-link emails that some corporate inboxes strip, blocking signup entirely. We need a single linear journey from "signed up" to "on the cohort waiting list," and email confirmation that survives strict email gateways.

## What Changes

- Email signup confirmation switches from magic-link to 6-digit OTP. Users entering the verification page now type a code instead of clicking a link. (No external API contract breaks; this is a UX change only.)
- New `/join/onboarding` route renders profile form (real name, nickname, contact info, optional referrer) plus cohort signup card in a single page.
- New `/join/complete` route promoted from inline render so post-submit navigation is unambiguous.
- `RootRedirect` post-login routing extended: users without `onboarding_complete = true` are routed to `/join/onboarding` regardless of auth provider (email, Google).
- Contact info collection accepts either phone number OR Kakao ID, chosen via segmented control. DB enforces "at least one" once `onboarding_complete = true`.
- `JoinFormPageForActiveOrNewUser` dispatcher renamed to `JoinDispatcher`; routes active users to existing re-join flow, everyone else to `/join/onboarding`.
- `JoinFormPageForNewUser` and `JoinFormCardForNewUser` deleted — replaced by `OnboardingPage`.
- `users.onboarding_complete` boolean column added; `users.kakao_id` text column added; CHECK constraint requires phone or Kakao when onboarded; backfill marks pre-existing onboarded users as complete.
- Supabase email template flipped to OTP (local `config.toml` + production dashboard).

## Capabilities

### New Capabilities
- `signup-onboarding`: integrated signup + onboarding + cohort-join flow covering email-OTP confirmation, profile collection (with phone-or-Kakao contact choice), cohort waiting-list entry, and completion redirect.

### Modified Capabilities
<!-- No existing specs to modify; everything in this change is net-new spec content. -->

## Impact

**Affected code:**
- `apps/web/src/login/components/`: SignupPage, VerifyEmailPage (rewrite), OnboardingPage (new), JoinDispatcher (rename), JoinCompletePage (route promotion), delete JoinFormPageForNewUser + JoinFormCardForNewUser
- `apps/web/src/shared/components/auth/RootRedirect.tsx`: add `onboarding_complete` branch
- `apps/web/src/shared/utils/routingDecisions.ts`: extend `resolveRootRedirect` input + branches
- `apps/web/src/shared/auth/supabaseAuth.ts`: add `verifyOtpForSignup`, drop `emailRedirectTo` from `signUpWithEmail`
- `apps/web/src/user/model/User.ts`: add `kakaoId`, `onboardingComplete` fields
- `apps/web/src/user/utils/userMappers.ts`: map new columns
- `apps/web/src/user/api/user.ts`: select new columns
- `apps/web/src/login/components/IntroCTA.tsx`, `apps/web/src/user/components/UserSettingPage.tsx`: rewire to `/join/form` (dispatcher)
- `apps/web/src/router.tsx`: add `/join/onboarding`, `/join/complete`; remove `/join/form/new-user`

**Database:**
- New migration adding `users.onboarding_complete BOOLEAN DEFAULT false`, `users.kakao_id TEXT`, CHECK constraint, and backfill UPDATE.

**Auth/infrastructure:**
- `supabase/config.toml`: `enable_confirmations = true`, custom OTP template path.
- New `supabase/templates/confirmation.html` (Korean OTP email).
- Production Supabase dashboard: manual email-template update before deploy (documented in tasks).

**Dependencies:** none added.

**Persona-level behavior changes:**
- New email/password user: `/signup → /verify-email (OTP) → /join/onboarding → /join/complete → /boards`
- Auto-linked email-over-Google: same path, OTP completes identity link
- Returning Google user not onboarded: `/login → / → RootRedirect → /join/onboarding`
- Returning user already in waiting list landing at `/`: now navigates to `/boards` (was: rendered `JoinCompletePage` inline)

**Risks surfaced during proposal review (resolved or mitigated in design.md):**
- Auto-link via `verifyOtp({ type: 'signup' })` for already-registered Google identities is unverified against this project's Supabase version. Implementation must begin with a verification spike before committing to UI rewrites.
- Production Supabase dashboard email template must be flipped (magic-link → OTP) before code deploys, or signup breaks. Mitigated by adding the dashboard step to a deploy checklist and surfacing it as a release-gate task.
- OTP rate-limit lockout state must have a defined Korean error message and recovery hint (Resend won't bypass lockout).
- Persona B (auto-link) needs an explicit "이미 등록된 구글 계정과 연결되었습니다" success notice; otherwise users don't know their accounts merged.
- Section 6 of the source design doc still references a "나중에 하기" link; the locked-in decision is to drop it. The design.md must reconcile.

**Accepted trade-offs:**
- Single PR over stacked PRs (locked in by author). Rollback unit is the full feature.
- Brief race window: users who sign up between migration apply and code deploy still go through the old magic-link flow; on next login they land on `/join/onboarding` because their `onboarding_complete` is `false`. Acceptable one-time UX glitch.
- Pre-existing users with `phone_number` populated are backfilled `onboarding_complete = true` and never prompted for `kakao_id`. The organizer follow-up to allow Kakao-ID collection later is tracked separately.
