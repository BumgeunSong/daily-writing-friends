# Pull Request — integrate-signup-cohort-flow

## PR Details

- **URL:** https://github.com/BumgeunSong/daily-writing-friends/pull/571
- **Branch:** `enhancing-email-and-password-login-feature`
- **Base:** `main`
- **Status:** Open, all checks green, awaiting human review

## CI Checks

### Round 1 (initial push)

| Check | Status | Notes |
|---|---|---|
| `Analyze (actions)` | SUCCESS | |
| `Analyze (javascript-typescript)` | SUCCESS | |
| `CodeQL` | SUCCESS | |
| `check-tests` | SUCCESS | |
| `test (20.x)` | SUCCESS | vitest 709/709 |
| `e2e` | **FAILURE** | Supabase migration version collision (see Round 1 fix) |
| `GitGuardian Security Checks` | SUCCESS | |
| `Vercel Preview Comments` | SUCCESS | |

### Round 1 fix — migration timestamp collision

`supabase/migrations/20260505000000_donations.sql` was merged to `main` while this branch was open. Both files claimed the same `20260505000000` prefix, which is the primary key in `supabase_migrations.schema_migrations`. The `e2e` job tried to apply both and Postgres rejected the second insert with `SQLSTATE 23505`.

**Fix:** rename `20260505000000_add_onboarding_complete_and_kakao_id.sql` → `20260506000000_add_onboarding_complete_and_kakao_id.sql`. The order is preserved (today's date is later) and no SQL inside the file changed. Verified locally with `supabase db reset` against the merged migration set, then with the two SQL fixture tests.

Commit: `d35543ca fix(migration): 20260505000000 → 20260506000000 으로 변경`. Followed by a clean merge of `origin/main` into the branch (donations + helper modules from main pulled in cleanly, test count rose from 709 → 723).

### Round 2 (after fix)

| Check | Status |
|---|---|
| `Analyze (actions)` | SUCCESS |
| `Analyze (javascript-typescript)` | SUCCESS |
| `CodeQL` | SUCCESS |
| `check-tests` | SUCCESS |
| `test (20.x)` | SUCCESS |
| `e2e` | SUCCESS |
| `GitGuardian Security Checks` | SUCCESS |
| `Vercel Preview Comments` | SUCCESS |
| `claude` | SKIPPED (intentional) |

## Review Iterations

### Round 0 — Self-review before PR (5 parallel reviewers)

8 findings (3 Critical, 4 Important, 1 nit) addressed in five follow-up commits before opening the PR. See `verify_report.md` and `spec-alignment.md` for detail.

### Round 1 — Copilot inline review (post-PR)

Copilot raised five inline comments on commit `c03db571`. All five resolved in commit `72c65585`:

| # | File | Finding | Resolution |
|---|---|---|---|
| 1 | `VerifyEmailPage.tsx:125` | `pattern='\d{6}'` — JSX evaluates as JS string literal so `'\d'` collapses to `'d'`, breaking HTML5 form validation for digit-only OTPs | Dropped the `pattern` attribute; the `onChange` digit filter already enforces the constraint |
| 2 | `OnboardingPage.tsx:47` | Zod `.refine()` always attached error to `path: ['phone']`, so kakao-tab errors stayed invisible | Switched to `.superRefine()` with dynamic path keyed on `activeContactTab` |
| 3 | `JoinDispatcher.tsx:22` | `useOnboardingComplete` queried but never branched on (extra round-trip + delayed routing) | Removed the hook call; intent documented in the component header |
| 4 | `tests/e2e/sql/users-backfill.test.sql:66` | Test omitted the migration's defensive `AND (phone OR kakao)` clause — regressions could pass here unnoticed | Aligned test UPDATE with migration body |
| 5 | `tests/e2e/utils/inbucket.ts:8` | Header comment claimed `/api/v1/messages` but implementation queries `/api/v1/search` | Updated comment to name the real endpoints |

Each fix was replied to in its inline thread (`r3198196979`–`r3198197386`).

### Round 2 — CI on `72c65585` (post-Copilot-fix)

All 8 active checks green; `claude` intentionally skipped.

### Round 2.5 — Copilot inline review on `72c65585` (round 2)

Copilot re-ran on the previous fix and surfaced six new findings, all addressed in commit `4269a527`:

| # | File | Finding | Resolution |
|---|---|---|---|
| 1 | `scripts/canary-verify-otp-template.ts:73` | Polled inbox's most-recent message without verifying recipient — an unrelated email with a 6-digit substring could pass the canary spuriously | Renamed to `pollMessageBodyForRecipient`; queries `/api/v1/search?query=to:<sentinel>` and double-checks the detail response's `To[]` |
| 2 | `scripts/canary-verify-otp-template.ts:23` | Header recommended `npm run canary:otp -- --target=production` but the script doesn't parse CLI flags | Updated header to show the env-var-only invocation |
| 3 | `apps/web/src/login/hooks/useOnboardingComplete.ts:29` | Docstring claimed "visible in Sentry" but only `console.error` ran — React Query global onError doesn't fire when queryFn handles the error | Imported `@sentry/react`; `Sentry.captureException(error, { tags, extra })` now runs alongside the log. Kept the 2-state contract; 3-state revisit tracked in retro |
| 4 | `apps/web/src/user/api/user.ts:24` | Concurrency comment said `INSERT ... ON CONFLICT DO NOTHING` but code uses `upsert(..., { ignoreDuplicates: true })` | Comment now names the real API call (`upsert` with `Prefer: resolution=ignore-duplicates`) and notes the semantic equivalence |
| 5 | `tests/e2e/sql/users-onboarding-constraints.test.sql:48` | DO block accepted any `check_violation`, hiding mismatched constraints | `GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME` + assertion against `users_contact_required_when_onboarded` |
| 6 | `tests/e2e/sql/users-onboarding-constraints.test.sql:67` | Same pattern in the kakao-format block | Same fix asserting `users_kakao_id_format` |

Each fix was replied to in its inline thread (`r3198260898`–`r3198261133`). The canary script was smoke-tested live against local Supabase + Mailpit; recipient filtering verified.

### Round 3 — CI on `4269a527`

All 8 active checks green; `claude` skipped.

### Round 3.5 — Copilot inline review on `4269a527` (round 3)

Copilot raised three new findings, all addressed in commit `cbc7d2b5`:

| # | File | Finding | Resolution |
|---|---|---|---|
| 1 | `VerifyEmailPage.tsx:61` | Public route + missing `email` (no router state, no sessionStorage) → OTP submit silently no-ops AND resend disabled = dead-end UI | `useEffect` redirects to `/signup` when `email` is empty after the initial state read |
| 2 | `OnboardingPage.tsx:310` | Active phone/kakao input rendered with `label=""`, suppressing the `<label>` and leaving inputs without an accessible name | Added `labelClassName` prop to `FormField`; phone/kakao inputs now ship Korean labels with `sr-only` styling — visual unchanged, screen readers always read the field name |
| 3 | `user/api/user.test.ts:101` | "TOCTOU race" test mocked `mockUsersInsert` 23505, but production code calls `upsert(..., { ignoreDuplicates: true })` — test passed vacuously | Rewrote to mock `mockUsersUpsert`, assert call args (`onConflict: 'id'`, `ignoreDuplicates: true`), and assert `insert` is NOT called — catches any future regression |

Each fix replied to in its inline thread (`r3207311004`, `r3207311103`, `r3207311244`).

### Round 4 — CI on `cbc7d2b5`

All 8 active checks green; `claude` skipped.

## Final Status

- [x] Spec alignment verified (`spec-alignment.md`, `final-spec-alignment.md`)
- [x] Branch synced with `origin/main` (Round 1 fix)
- [x] Copilot review round 1 addressed (5/5, commit `72c65585`)
- [x] Copilot review round 2 addressed (6/6, commit `4269a527`)
- [x] Copilot review round 3 addressed (3/3, commit `cbc7d2b5`)
- [x] CI green on latest commit (round 4)
- [ ] Awaiting human review approval
- [ ] Section 15 manual deploy checklist (run by merge author at deploy time)
