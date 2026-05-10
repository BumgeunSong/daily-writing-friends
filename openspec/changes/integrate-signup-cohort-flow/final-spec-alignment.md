# Final Spec Alignment — integrate-signup-cohort-flow

**Date:** 2026-05-06 (post-CI-green)
**Branch HEAD:** `d918380f` (after migration-rename fix and `origin/main` merge)
**Spec source:** `openspec/changes/integrate-signup-cohort-flow/specs/signup-onboarding/spec.md`

## Alignment Summary

| Requirement | Status | Notes |
|---|---|---|
| Email-OTP signup confirmation | Aligned | No changes since `spec-alignment.md` |
| Persona B (already-registered email) routes to login + add-login-method | Aligned | No changes |
| Onboarding page collects profile and cohort signup in one step | Aligned | No changes |
| Contact info accepts phone OR Kakao ID | Aligned | No changes |
| Database enforces contact info when onboarded | Aligned | Migration filename changed (timestamp prefix), SQL body unchanged; CHECK constraints identical |
| Backfill marks pre-existing onboarded users | Aligned | Spec already updated in `spec-alignment.md`; SQL body unchanged |
| Post-login routing respects onboarding_complete | Aligned | No changes |
| Cohort-signup dispatcher routes by user state | Aligned | No changes |
| Submit completion page is its own route | Aligned | No changes |
| Verification spike precedes implementation | Aligned | No changes |

## Round 2 (post-Copilot review fix in `72c65585`)

Re-checked alignment after addressing five Copilot inline comments:

- **Contact info accepts phone OR Kakao ID** — still aligned. The Zod schema change (`refine` → `superRefine` with dynamic path keyed on `activeContactTab`) is a strict UX improvement: the spec scenario "Phone validation rejects under 10 digits" mentions "the form SHALL block submission with a Korean error message," which is now visible on whichever tab is active.
- **Cohort-signup dispatcher routes by user state** — still aligned. Removing `useOnboardingComplete` from `JoinDispatcher` does not change the routing decisions; both pre-fix and post-fix code routes onboarded-but-inactive users to `/join/onboarding` (per spec scenario "Onboarded but inactive non-waitlist user uses dispatcher").
- All other requirements are unaffected (no changes to migrations, models, mappers, or auth helpers between rounds).

## Drifted Requirements

None.

## Missing Requirements

None.

## Removed Requirements

None.

## Spec Updates Made

None during this phase. The PR-review-driven change (migration rename) altered only the file's timestamp prefix; the SQL body did not change, so no spec scenario shifted.

## Notes for merge author

- `tasks.md` Section 2.1 still names the migration file as `20260505000000_…`. The actual file is `20260506000000_…` after the timestamp collision fix. Updated below in the same commit so future readers find the file by its real name.
- Section 15 (production deploy) remains the merge author's responsibility: dashboard template flip → `npm run canary:otp` → `supabase db push` → app deploy.
