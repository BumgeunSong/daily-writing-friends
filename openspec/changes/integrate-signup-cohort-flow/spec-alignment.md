# Spec Alignment — integrate-signup-cohort-flow

**Date:** 2026-05-06
**Branch HEAD:** `90666d29` (post-verify-report)
**Spec source:** `openspec/changes/integrate-signup-cohort-flow/specs/signup-onboarding/spec.md`

## Alignment Summary

| Spec File | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| `signup-onboarding/spec.md` | Email-OTP signup confirmation | Aligned | `signUpWithEmail` drops `emailRedirectTo`; `confirmation.html` uses `{{ .Token }}` only; `verifyOtpForSignup` calls `verifyOtp({ type: 'signup' })`; runtime verified |
| `signup-onboarding/spec.md` | Persona B (already-registered email) routes to login + add-login-method | Aligned | `SignupPage.onSubmit` catches `isAlreadyRegisteredError` and shows inline 안내 with `/settings/add-login-method` link; runtime verified |
| `signup-onboarding/spec.md` | Onboarding page collects profile and cohort signup in one step | Aligned | `OnboardingPage` renders `realName`, `nickname`, contact-tab segmented control, `referrer`, cohort card; `resolveOnboardingSubmit` packages writes; runtime verified |
| `signup-onboarding/spec.md` | Contact info accepts phone OR Kakao ID | Aligned | Tab segmented control; inactive-tab values retained (D4); Zod refine + `validatePhone`/`validateKakaoId`; runtime verified phone-tab and kakao-tab paths |
| `signup-onboarding/spec.md` | Database enforces contact info when onboarded | Aligned | `users_contact_required_when_onboarded` CHECK; SQL test passes |
| `signup-onboarding/spec.md` | Backfill marks pre-existing onboarded users | Drifted (intentional, spec amended below) | Migration tightened during apply: backfill now requires `phone_number IS NOT NULL OR kakao_id IS NOT NULL` AND a permission/waitlist/phone signal. Spec scenarios still describe the broader intent; reality is conservatively narrower. Documented below. |
| `signup-onboarding/spec.md` | Post-login routing respects onboarding_complete | Aligned | `resolveRootRedirect` extended; `useOnboardingComplete` reads narrow column; `joinComplete` variant removed; runtime verified onboarded user → /join, no-onboarding user → /join/onboarding |
| `signup-onboarding/spec.md` | Cohort-signup dispatcher routes by user state | Aligned | `JoinDispatcher` handles 3 effective branches (active, waitlist, else=onboarding); both "not onboarded" and "onboarded but no cohort" land on `/join/onboarding` per design D8 (re-apply surface); runtime verified |
| `signup-onboarding/spec.md` | Submit completion page is its own route | Aligned | `JoinCompletePage` reads `useLocation().state`; empty fallback `name=''`, `cohort=0`; route `/join/complete` registered |
| `signup-onboarding/spec.md` | Verification spike precedes implementation | Aligned | `docs/plans/2026-05-05-otp-spike-report.md` records all 4 spike checks; spec scenarios "Spike result branches implementation" and "Spike result determines session-binding mitigation" satisfied with documented decisions |

## Drifted Requirements

### Backfill — narrowed to "signal AND contact"

**What the spec says (2 of 4 scenarios):**

> #### Scenario: User with board permission is marked complete
> WHEN the backfill runs and a user has at least one row in `user_board_permissions`
> THEN that user's `onboarding_complete` SHALL be `true` after the migration

> #### Scenario: User in any waiting list is marked complete
> WHEN the backfill runs and a user has at least one row in `board_waiting_users`
> THEN that user's `onboarding_complete` SHALL be `true` after the migration

**What the implementation actually does:**

```sql
UPDATE public.users SET onboarding_complete = true
WHERE
  (
    id IN (SELECT DISTINCT user_id FROM public.user_board_permissions)
    OR id IN (SELECT DISTINCT user_id FROM public.board_waiting_users)
    OR phone_number IS NOT NULL
  )
  AND (phone_number IS NOT NULL OR kakao_id IS NOT NULL);
```

A user with permission/waitlist but **no contact info at all** stays `onboarding_complete = false` instead of being marked true.

**Why it drifted:** Step 5 of the migration validates `users_contact_required_when_onboarded`. If the backfill marks a permission-only-no-contact row as complete, `VALIDATE` fails and the migration aborts. The two scenarios as written assume "permission ⇒ contact info present" — true for production data per the cohort organizer's onboarding history, but not enforceable purely from the spec text. The defensive AND clause is documented in the migration's comment as a guard against environments where that invariant doesn't hold.

**Resolution:** Spec scenarios updated to reflect reality — see "Spec Updates Made" below.

## Missing Requirements

None. All scenarios in the spec map to implementation code that has been runtime-verified.

## Removed Requirements

None.

## Spec Updates Made

`specs/signup-onboarding/spec.md` — the two backfill scenarios above are updated in-place to reflect the implementation invariant:

- "Scenario: User with board permission is marked complete" gets a clarifying clause: "AND has at least one of `phone_number` or `kakao_id` populated."
- "Scenario: User in any waiting list is marked complete" gets the same clarifying clause.
- "Scenario: User with no signal stays incomplete" remains unchanged.
- A new scenario, "Scenario: Permission/waitlist user without any contact info stays incomplete," is added to capture the defensive case explicitly.

These edits are applied as part of this spec-alignment commit.

## Notes for PR review

- Apply-phase pivot from spike: the `success-linked` UI scenario was REMOVED from the spec earlier (during apply), with rationale documented in the spike report. That earlier edit and this backfill edit are the only spec updates the implementation drove.
- `tasks.md` boxes 11.3 and T.9 are marked as DROPPED with rationale, not as `[x]` — they reflect the spike-driven scope reduction, not work-not-done.
- Section 15 (production deploy) remains pending, executed by the merge author at deploy time.
