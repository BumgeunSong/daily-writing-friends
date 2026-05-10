## Review Summary

**Status**: Ready (with explicit accepted trade-offs)
**Iteration**: 1 of max 2

Five reviewers ran in parallel. Architecture said Ready outright. The other four (security, quality, testability, integration) returned Needs Revision with concrete, additive findings — no architectural rethink, all addressable inside the existing design. Round-1 edits to `design.md` cover every Critical and every Important. Two security findings were *accepted as out-of-scope* with rationale. No second iteration is needed because no Critical survives the Round-1 edits.

## Architecture

- *architecture-reviewer*: Ready. Pure-function + thin-shell pattern preserved (`resolveRootRedirect`, `resolveOnboardingSubmit`). `OnboardingPage` correctly delegates submit logic to a unit-testable function. `useOnboardingComplete` is a justified narrow-hook, not a duplication. `JoinDispatcher` at 3 destinations is the right level. Apple Sign-In would slot in cleanly. Forward-looking note: `RootRedirectInput` will hit interface bloat at ~12 fields; consider grouping into `UserState` sub-object before the next auth-gate addition. **Tracked as a follow-up; no action this iteration.**

## Security

- *security-reviewer*: Needs Revision. Findings:
  - **Auto-link session-binding** (Important): an OTP issued in browser A may or may not be redeemable in browser B. **Resolved** by adding step 3 to D1 spike — the spike must explicitly test this and document the residual risk if absent.
  - **OTP brute-force per-email** (Important): IP rate limit is bypassable by botnets. **Accepted as out-of-scope** in D11 with quantified probability (0.036% per attack window) and follow-up plan (Edge Function wrapper if abuse observed).
  - **`onboarding_complete` writable via RLS** (Important): a user can self-set the flag. **Accepted** in D11 — the flag controls only routing, never permissions; the cohort organizer is the only party affected.
  - **`kakao_id` injection risk** (Minor): **Resolved** by adding a regex CHECK constraint in D6 (`^[A-Za-z0-9._-]+$`, 1–50 chars).
  - Email template `{{ .Token }}` is safe (no user content interpolation). RLS bypass at backfill is expected (service role).

## Quality & Performance

- *quality-reviewer*: Needs Revision. Findings:
  - **`identityCount` unreliable as auto-link signal** (Critical): **Resolved** in D9. `verifyOtpForSignup` now returns `{ ok: true; providers: string[] }` (or error variant) so `decideVerifySuccessState` can match on `providers.includes('google') && providers.includes('email')`.
  - **Migration lock duration** (Important): **Resolved** in D6. CHECK constraint added with `NOT VALID + VALIDATE CONSTRAINT` pattern to use `SHARE UPDATE EXCLUSIVE` instead of `ACCESS EXCLUSIVE`.
  - **`OnboardingPage` 5-source waterfall** (Important): **Resolved** in D3. Two stages explicitly documented: stage 1 (`useAuth` resolves uid), stage 2 (4 hooks fire in parallel). Skeleton covers both.
  - **OTP error-code mapping unspecified** (Important): **Resolved** in D5. Canonical mapping table for `over_email_send_rate_limit`, `otp_expired`, `invalid_token`, fallback `unknown` — finalized by D1 spike step 4.
  - **Form validation for inactive tab** (Minor): **Resolved** in D4 with the explicit Zod schema using `refine` keyed on `activeContactTab`.
  - **`__verifyEmailTemplateIsOTP()` ships dead code** (Minor): **Resolved** in D7 — moved to `scripts/canary-verify-otp-template.ts` outside the production bundle.

## Testability

- *testability-reviewer*: Needs Revision. Findings:
  - **`resolveOnboardingSubmit` signature risks hook entanglement** (Critical): **Resolved** in D3. Pinned signature uses plain `OnboardingFormValues` + `OnboardingSubmitContext` interfaces; no hook returns flow in.
  - **Missing `decideVerifySuccessState` pure helper** (Critical): **Resolved**. New helper specified in D5; tests enumerated in Testability Notes / Unit.
  - **D6 vs Layer 4 SQL test contradiction** (Important): **Resolved** in D6 — the prose "no unit test for raw SQL" line was removed. Layer 4 SQL tests are canonical.
  - **Layer 3 skip not justified** (Important): **Resolved** in Layer-3 / Layer-4 sections. The signup→complete journey depends on Inbucket OTP delivery, so it's a Layer 4 concern. The `/verify-email` state machine gets a Vitest+RTL component test fed by `decideVerifySuccessState`'s output.
  - **Inbucket parsing prerequisite** (Minor): **Resolved**. Tracked as a Layer-4 prerequisite in the Testability Notes; tasks.md task 1 will confirm whether tooling exists or needs to be added.

## API & Integration

- *integration-reviewer*: Needs Revision. Findings:
  - **`ROUTES` constants missing new paths** (Important): **Resolved** in D10 — `ROUTES.ONBOARDING` and `ROUTES.JOIN_COMPLETE` added.
  - **`select()` location pointed at wrong file** (Important): **Resolved** in D10. Canonical location is `apps/web/src/shared/api/supabaseReads.ts`, not `apps/web/src/user/api/user.ts`.
  - **`JoinFormHeader.tsx` retention** (Important): **Resolved** in D10 with explicit "Retained" note.
  - **`JoinFormDataForNewUser` type cleanup** (Minor): **Resolved** in D10 cleanup list.
  - **`useUserNickname` import in RootRedirect** (Minor): **Resolved** in D10 cleanup list — remove import only, hook stays.
  - Naming consistency: clean (no inconsistencies found).
  - Migration timestamp: collision-free.

## Consolidated Findings

### Critical
- **identityCount unreliable** (quality) → resolved in D9 (return `providers: string[]`).
- **`resolveOnboardingSubmit` signature risks hook entanglement** (testability) → resolved in D3 (pinned plain-data signature).
- **Missing `decideVerifySuccessState` pure helper** (testability) → resolved in D5 (new helper specified, tests enumerated).

### Important
All resolved or accepted (see Architecture / Security / Quality & Performance / Testability / API & Integration sections above).

### Minor
All resolved or tracked as follow-ups.

## Accepted Trade-offs

- **Per-email OTP rate limit deferred.** Quantified brute-force probability is 0.036% per 1-hour attack window; IP-rate limit + token expiry suffice for launch. Edge Function follow-up tracked separately.
- **`onboarding_complete` writable via RLS.** Flag controls routing only, never permissions. Self-setting is harmless; cohort organizer's contact-info problem is the only consequence and the CHECK constraint forces *some* contact value.
- **`RootRedirectInput` interface growth (10 fields).** Manageable today; group into sub-objects before next auth-gate addition.
- **Single-PR rollback unit.** Carried over from proposal trade-offs.
- **Auto-link session-binding** is a *spike-determined* trade-off — D1 spike's step 3 decides whether an extra confirmation step is added or whether the residual risk is documented.

## Revision History

- **Round 1 (2026-05-05):** All 5 reviewers ran. 4 of 5 returned Needs Revision; 1 (architecture) returned Ready. Edits to `design.md`:
  - D1: Added session-binding spike step + error-shape capture step.
  - D3: Pinned `resolveOnboardingSubmit` signature with plain-data interfaces. Documented two-stage waterfall.
  - D4: Added explicit Zod schema using `refine` keyed on `activeContactTab`.
  - D5: Added `decideVerifySuccessState` pure helper; canonical Supabase error-code mapping; click-through banner replacing 2.5s auto-redirect timer.
  - D6: Added `kakao_id` regex CHECK; switched main constraint to `NOT VALID + VALIDATE` pattern; removed contradictory "no SQL test" prose.
  - D7: Canary helper moved from prod bundle to `scripts/canary-verify-otp-template.ts`.
  - D9: `verifyOtpForSignup` returns `VerifyOtpOutcome` (with `providers` array, not `identityCount`).
  - D10: `select()` redirected to `supabaseReads.ts`; `ROUTES` constants added; `JoinFormHeader` retention noted; type/import cleanup list added.
  - D11: New section. Per-email rate limit deferred (with rationale and follow-up plan); RLS column-write accepted; Kakao-ID format CHECK linked to D6; auto-link session-binding deferred to spike.
  - Testability Notes: enumerated tests for `decideVerifySuccessState` and `classifySupabaseAuthError`; Layer 3 skip justified by infrastructure dependency; Inbucket prerequisite documented; `kakao_id` format SQL test added.

  **Stop condition:** No Critical issue remains in the design. The two surviving Important items are *accepted trade-offs with rationale*, not unresolved design gaps.

- **Round 2:** Skipped — Round-1 edits closed every Critical; no need to re-run.
