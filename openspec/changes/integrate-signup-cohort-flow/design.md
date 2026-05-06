## Context

The source design lives at `docs/plans/2026-05-05-integrated-signup-flow-design.md` and was authored before this OpenSpec proposal cycle. This document does not duplicate that work — it builds on top of it, resolves the design-level findings raised in `proposal-review.md`, and specifies the implementation contracts that `tasks.md` will enforce.

**Current state (relevant for understanding):**
- `apps/web/src/login/components/SignupPage.tsx`: calls `signUpWithEmail` with `emailRedirectTo` so confirmation arrives as a magic link.
- `apps/web/src/login/components/VerifyEmailPage.tsx`: shows "check your inbox" UI, only offers Resend.
- `apps/web/src/shared/components/auth/RootRedirect.tsx`: routes via `resolveRootRedirect()` which has branches for `(no user → /join), (active → /boards), (in waiting list → render JoinCompletePage inline), (else → /join)`. No `onboarding_complete` awareness.
- `apps/web/src/login/components/JoinFormPageForActiveOrNewUser.tsx`: dispatcher to `/join/form/active-user` or `/join/form/new-user`.
- `apps/web/src/login/components/JoinFormPageForNewUser.tsx` + `JoinFormCardForNewUser.tsx`: profile + cohort form. To be deleted.
- `public.users` table: has `phone_number` (text, nullable), no `onboarding_complete`, no `kakao_id`.
- `supabase/config.toml`: `[auth.email] enable_confirmations = false` currently. `otp_length = 6`, `otp_expiry = 3600`.
- No custom email template (Supabase defaults emit magic-link).
- Vitest + React Testing Library is the unit/integration runner. agent-browser is E2E. dev3000 captures timelines. Local Supabase Docker is available.

## Goals / Non-Goals

**Goals:**
- A user signing up with email/password reaches the cohort waiting list in one continuous journey, no manual navigation gaps.
- A user receives a 6-digit code in email and types it on `/verify-email`, even when their corporate gateway strips outbound links.
- A user with an existing Google identity for the same email lands on a session-linked account after typing the OTP, and is told the link happened.
- Pre-existing onboarded users (active or waiting-list members) are not re-prompted.
- Routing logic is centralized so future entry points just navigate to a single dispatcher route and let the existing decision function decide.
- Pure routing and validation logic is unit-testable in Vitest without mocking Supabase.

**Non-Goals:**
- Replacing Google OAuth or password reset flows.
- Building a "kakao_id collection campaign" UI for users already backfilled as `onboarding_complete = true`.
- Solving the "user with no upcoming cohort lands on read-only `/boards`" empty-state UX (out-of-scope, tracked separately).
- Any change to admin grant of `boardPermissions: write`.

## Decisions

### D1. Verification spike runs first, before any UI rewrite

**What:** task 0 in `tasks.md` is a 30–60 minute spike against local Supabase Docker:

Spike checklist:
1. Call `signUp({email, password})` for an email already registered as a Google user. Observe whether `auth.users` shows a new row, whether the email queue receives a confirmation message, and what `error.message` (if any) returns.
2. From the **same browser session** that called `signUp`, call `verifyOtp({email, token, type:'signup'})` with the emitted token. Observe whether `data.user.identities` includes both `email` and `google` providers and whether session metadata reflects the link.
3. From a **different browser session** (different localStorage / cookies), repeat step 2 with the same token to test session binding. The token must fail verification or fail to establish a session in the second browser; if it succeeds, document the residual social-engineering risk.
4. Capture the exact `error` shape when:
   - OTP token is wrong (5 wrong attempts)
   - OTP rate-limit kicks in
   - OTP token is expired (wait > 1 hour OR manually invalidate)

**Why:** Two reviewers flagged this as Critical. Supabase's auto-linking happens at signup time, not necessarily at verify time. Session binding (step 3) determines whether an attacker can complete an OTP flow initiated elsewhere. Steps 4 produces the canonical error-shape table consumed by D5.

**Implementation branches based on spike result:**
- **If linking works at `verifyOtp` AND session-bound:** proceed as designed.
- **If `signUp` returns `already_registered` with no email:** add `signInWithOtp({email})` fallback in `SignupPage.onSubmit` for the auto-link branch.
- **If linking does not happen at all:** abort the auto-link strand and require these users to use Google login + `/settings/add-login-method`.
- **If token is NOT session-bound:** add an explicit "Did you initiate this signup?" confirmation step on `/verify-email` before completing verification.

**Alternative rejected:** "trust the source design and find out in production." Rejected because the cost of a one-hour spike is far less than a production rollback.

### D2. Routing-decision change is purely additive in `resolveRootRedirect`

**What:**
- Add `onboardingComplete: boolean` and `hasUpcomingCohort: boolean` to `RootRedirectInput`.
- Replace the `if (input.isInWaitingList) → joinComplete` branch with `if (input.isInWaitingList) → /boards`.
- Add new branch: `if (!input.onboardingComplete) → /join/onboarding`.
- Remove the `joinComplete` variant from `RootRedirectResult`.
- Update `RootRedirect.tsx` to source `onboardingComplete` from a new hook `useOnboardingComplete(uid)` (reads `users.onboarding_complete`).

**Why:** The function's existing structure (pure, well-tested in `routingDecisions.test.ts`) is already the right place. `JoinCompletePage` becoming its own route eliminates the inline render variant, simplifying `RootRedirect.tsx`. Persona F's regression (no "신청 완료" feedback at root) is mitigated by the existing `IntroCTA` "신청 완료" state when they navigate to `/join` — root no longer tries to show celebratory UI.

**Alternative rejected:** keeping `JoinCompletePage` inline render in `RootRedirect`. Rejected because two render paths for the same page (root inline + `/join/complete` route) creates two sources of truth for the same UI.

### D3. `OnboardingPage` is a new component built from scratch

**What:** new file `apps/web/src/login/components/OnboardingPage.tsx`. Reads `currentUser`, `useUpcomingBoard`, `useIsUserInWaitingList`. Pre-fills profile from `fetchUser(uid)` if any data exists. Form contains:
- `realName` (required, text)
- `nickname` (required, text)
- contact info: tabbed input — `[전화번호] [카카오 ID]` segmented control. Default tab = phone. Active tab's input visible.
- `referrer` (optional, text)
- below the form: cohort signup card.

**Pinned pure-function signature** (lives in `apps/web/src/login/utils/onboardingSubmit.ts`, no hook references):
```ts
export interface OnboardingFormValues {
  realName: string;
  nickname: string;
  phone: string;        // form holds both; only the active tab's value
  kakaoId: string;      // is non-null in the resulting payload
  referrer: string;
  activeContactTab: 'phone' | 'kakao';
}

export interface OnboardingSubmitContext {
  uid: string;          // plain data, not the AuthUser hook return
  upcomingBoardId: string | null;
  upcomingCohort: number | null;
}

export type OnboardingSubmitAction =
  | {
      kind: 'updateThenWaitlist';
      uid: string;
      boardId: string;
      cohort: number;
      profilePayload: SupabaseUserUpdate;
      navigateTo: { path: '/join/complete'; state: { name: string; cohort: number } };
    }
  | {
      kind: 'updateOnly';
      uid: string;
      profilePayload: SupabaseUserUpdate;
      navigateTo: { path: '/boards' };
    };

export function resolveOnboardingSubmit(
  values: OnboardingFormValues,
  ctx: OnboardingSubmitContext,
): OnboardingSubmitAction;
```

The component performs the side effects (`updateUser`, `addUserToBoardWaitingList`, `navigate`) by reading the action returned by the pure function. Tests cover all 4 input combinations (cohort exists/null × phone tab / kakao tab) using plain inputs only.

If `useIsUserInWaitingList` returns true on mount: redirect to `/boards`.

**Loading sequence (waterfall acknowledged):**
- Stage 1: `useAuth()` resolves `currentUser` and `uid` (single network round-trip via Supabase auth state).
- Stage 2: in parallel, `useUpcomingBoard`, `useIsUserInWaitingList(uid)`, `useOnboardingComplete(uid)`, and `fetchUser(uid)` all begin fetching.

The component renders a single skeleton until both stages resolve. There is no third-stage waterfall; this matches the existing `RootRedirect` cost. Document this in the component header comment so future readers don't try to "optimize" by parallelizing stage-1 + stage-2 (impossible without uid).

**Why:** the existing `JoinFormCardForNewUser` was built for cohort-only data and lacks contact-info-tab support. Rebuilding allows applying current design tokens (consult `daily-writing-friends-design` skill) and avoids retrofitting a deprecated layout.

### D4. Tab switching does NOT clear inactive form state

**What:** `react-hook-form` keeps both `phone` and `kakaoId` field values in form state regardless of which tab is visible. Tab switch only toggles which input is rendered. On submit, the inactive tab's value is sent as `null` (and only the active tab's value is validated and stored).

The Zod schema applies validation conditionally on `activeContactTab`:
```ts
const schema = z.object({
  // ...
  phone: z.string(),
  kakaoId: z.string(),
  activeContactTab: z.enum(['phone', 'kakao']),
}).refine((v) => v.activeContactTab === 'phone' ? validatePhone(v.phone) !== null : validateKakaoId(v.kakaoId) !== null,
  { message: '연락처를 입력해주세요.', path: ['phone'] });
```
The inactive tab's field is *not* required and *not* validated; it is simply silently kept in form state.

**Why:** The user-friendly behavior is to retain both values silently so a user accidentally tapping a tab doesn't lose data. The DB column for the inactive tab is set to `null` only at the actual `updateUser` call.

**Alternative rejected:** clear-on-tab-switch. Rejected because it introduces silent data loss.

### D5. `/verify-email` states + pure decision helper

**Pure decision function** (lives in `apps/web/src/login/utils/verifyEmailState.ts`):
```ts
export type VerifyOtpOutcome =
  | { ok: true; providers: string[] }      // success path; providers from data.user.identities
  | { ok: false; errorCode: 'expired' | 'rate_limit' | 'invalid_token' | 'unknown' };

export type VerifyState =
  | { kind: 'entry' }
  | { kind: 'success' }
  | { kind: 'success-linked' }              // prior Google identity now linked
  | { kind: 'locked' }
  | { kind: 'error-inline'; message: string };

export function decideVerifySuccessState(outcome: VerifyOtpOutcome): VerifyState;
```

Decision rules:
- `ok: true` AND `providers.includes('google') AND providers.includes('email')` → `success-linked`
- `ok: true` otherwise → `success`
- `errorCode: 'rate_limit'` → `locked`
- `errorCode: 'expired'` → `error-inline` with copy "인증 코드가 만료되었습니다. 다시 받기를 눌러주세요."
- `errorCode: 'invalid_token'` → `error-inline` with copy "인증 코드가 올바르지 않습니다. 다시 확인해주세요."
- `errorCode: 'unknown'` → `error-inline` with copy "인증에 실패했습니다. 잠시 후 다시 시도해주세요."

**Supabase error-code mapping** (canonical, derived from D1 spike step 4):
- `over_email_send_rate_limit` OR HTTP 429 OR `error.status === 429` → `rate_limit`
- `error.message.includes('expired')` OR `error.code === 'otp_expired'` → `expired`
- `error.message.includes('invalid')` OR `error.code === 'invalid_token'` → `invalid_token`
- otherwise → `unknown`

These exact strings are *finalized by the D1 spike* — the implementer must run the spike and update this mapping before writing the component.

**UI per state:**
- `entry`: 6-digit code input + Resend button.
- `success`: brief toast "인증 완료" + immediate navigate to `/join/onboarding`.
- `success-linked`: full-page banner "이미 등록된 구글 계정과 연결되었습니다." with explicit "계속하기" button (no auto-redirect timer — auto-advance was a YAGNI risk).
- `locked`: Korean copy "인증 시도가 너무 많습니다. 잠시 후 다시 시도해주세요. (최대 1시간)" Resend button disabled. Recovery hint includes contact email.
- `error-inline`: inline error message above the input. Resend works.

**Why:** the `decideVerifySuccessState` pure helper makes Persona B's auto-link banner unit-testable without React Testing Library. Auto-advance timer dropped — a click-through banner is clearer and removes timer-related test flakiness.

### D6. Database migration name and content

**File:** `supabase/migrations/20260505000000_add_onboarding_complete_and_kakao_id.sql`

**Operations (in order):**
1. `ALTER TABLE users ADD COLUMN onboarding_complete BOOLEAN NOT NULL DEFAULT false;`
2. `ALTER TABLE users ADD COLUMN kakao_id TEXT;`
3. Add Kakao-ID format CHECK (cheap, no full-table scan because column is freshly null):
   `ALTER TABLE users ADD CONSTRAINT users_kakao_id_format CHECK (kakao_id IS NULL OR (char_length(kakao_id) BETWEEN 1 AND 50 AND kakao_id ~ '^[A-Za-z0-9._-]+$'));`
4. Backfill: `UPDATE users SET onboarding_complete = true WHERE id IN (SELECT DISTINCT user_id FROM user_board_permissions) OR id IN (SELECT DISTINCT user_id FROM board_waiting_users) OR phone_number IS NOT NULL;`
5. Add CHECK constraint with `NOT VALID` first to avoid full-table scan, then `VALIDATE`:
   ```sql
   ALTER TABLE users ADD CONSTRAINT users_contact_required_when_onboarded
     CHECK (NOT onboarding_complete OR phone_number IS NOT NULL OR kakao_id IS NOT NULL)
     NOT VALID;
   ALTER TABLE users VALIDATE CONSTRAINT users_contact_required_when_onboarded;
   ```

**Why this order and pattern:**
- Adding columns with `DEFAULT false` is constant-time in modern Postgres (no row scan).
- The Kakao-ID format CHECK is added *before* any code can write `kakao_id`, so all existing rows trivially pass (NULL).
- Backfill runs in a single transaction. On the current `users` table size (under 1000 rows for this app per recent activity), lock duration is negligible. The `NOT VALID + VALIDATE` pattern is included as defense-in-depth for future scale.
- `VALIDATE CONSTRAINT` performs the row scan with a weaker lock (`SHARE UPDATE EXCLUSIVE`) than `ADD CONSTRAINT` would (`ACCESS EXCLUSIVE`). Concurrent writes still proceed.

**Alternative considered:** infer `onboarding_complete` at query time instead of storing. Rejected because routing decisions get evaluated multiple times per page load; reading a single boolean is cheaper than a join.

**SQL test (Layer 4):** the migration's correctness is verified by a seeded-dataset test (see Testability Notes). The previous prose "no unit test for raw SQL" is removed; the Layer 4 entry is the canonical answer.

### D7. Email template + production dashboard guard

**Local config (`supabase/config.toml`):**
```toml
[auth.email]
enable_confirmations = true
otp_length = 6
otp_expiry = 3600

[auth.email.template.confirmation]
subject = "매일 글쓰기 프렌즈 인증 코드"
content_path = "./supabase/templates/confirmation.html"
```

**Template (`supabase/templates/confirmation.html`):** simple Korean HTML with `{{ .Token }}` (6-digit code) and minimal styling. No `{{ .ConfirmationURL }}` so corporate gateways have nothing to strip.

**Production dashboard guard:** the `tasks.md` deploy step calls out the manual dashboard update explicitly. A standalone canary script `scripts/canary-verify-otp-template.ts` (NOT shipped in production bundle) signs up a sentinel `dwf-canary+<timestamp>@<allowed-test-domain>` and asserts the resulting email body contains a 6-digit token. The script is run twice: once locally (against Inbucket) and once against staging/production (against a real inbox the engineer controls) as a release-checklist gate.

**Why not automate the dashboard flip:** Supabase Management API can update auth templates, but adding an auth dependency for a one-time deployment step is over-engineering. The manual checklist + canary script is sufficient. The canary script is in `scripts/` not `apps/web/src/` so it does not increase the production bundle.

### D8. Dispatcher rename, route rewiring

**What:**
- Rename file: `JoinFormPageForActiveOrNewUser.tsx` → `JoinDispatcher.tsx`.
- Component reads `useIsCurrentUserActive`, `useIsUserInWaitingList`, `useOnboardingComplete`.
- Routes:
  - active → `navigate('/join/form/active-user', {replace:true})`
  - in waiting list → `navigate('/boards', {replace:true})`
  - else → `navigate('/join/onboarding', {replace:true})`
- Same skeleton UI as today during loading.
- Router.tsx: route `/join/form` keeps pointing to `<JoinDispatcher />`. Routes `/join/form/new-user` is removed. Routes `/join/onboarding` and `/join/complete` are added under `privateRoutesWithoutNav`.

**Why:** keeps the call-site contract (`/join/form` is the universal "start cohort signup" link) while adapting the destination to the user's current state.

### D11. Security trade-offs explicitly accepted

**Per-email OTP rate limit (deferred):** Supabase IP-based rate limit (30 verifications / 5 min / IP) plus 1-hour token expiry yields a per-attack-window brute-force success probability of 0.036%. A botnet rotating IPs evades per-IP limits but the 1-hour token rotation still bounds the attack budget. Adding a per-email limit requires a Supabase Edge Function or RPC-guarded verify, which expands the change surface significantly. **Accepted as out-of-scope** for this change with a tracked follow-up. Implementation note: if abuse is observed, the follow-up adds an Edge Function that wraps `verifyOtp` and tracks per-email failure counts in a `auth_otp_attempts` table.

**`onboarding_complete` writable via RLS (accepted):** The existing `users` UPDATE policy is `auth.uid() = id` with no column restriction. A user *could* write `onboarding_complete = true` directly via the Supabase client, satisfying the CHECK by also writing a fake `kakao_id`. This is harmless: the only thing `onboarding_complete = true` controls is whether `RootRedirect` shows the onboarding form — a user who chose to skip it has only inconvenienced themselves and the cohort organizer (who lacks valid contact info). Routing decisions never grant elevated permissions based on this flag. **Accepted.** No column-level guard added.

**`kakao_id` format CHECK (added):** D6 includes a regex CHECK constraint `^[A-Za-z0-9._-]+$` (1–50 chars). This blocks HTML/JS payload storage at the DB level. Application-level rendering of `kakao_id` is plain text (admin views) but the constraint is defense-in-depth.

**Auto-link session-binding (deferred to D1 spike):** the spike's step 3 explicitly tests whether a token issued in browser A can complete verification in browser B. Result determines whether an "Did you initiate this signup?" confirmation is added to `/verify-email`.

### D9. New auth helper `verifyOtpForSignup`

**File:** `apps/web/src/shared/auth/supabaseAuth.ts`. New function returns the typed `VerifyOtpOutcome` shape consumed by `decideVerifySuccessState` (D5):
```ts
import type { VerifyOtpOutcome } from '@/login/utils/verifyEmailState';

export async function verifyOtpForSignup(email: string, token: string): Promise<VerifyOtpOutcome> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
  if (error) {
    return { ok: false, errorCode: classifySupabaseAuthError(error) };
  }
  const providers = (data.user?.identities ?? []).map((i) => i.provider).filter(Boolean) as string[];
  return { ok: true, providers };
}

function classifySupabaseAuthError(err: unknown): VerifyOtpOutcome extends { ok: false; errorCode: infer E } ? E : never {
  // Mapping table is finalized after D1 spike step 4. See D5 for canonical list.
}
```

The `providers` array contains discriminator strings (e.g., `['email']` or `['email', 'google']`). `decideVerifySuccessState` consumes this; `verifyOtpForSignup` does no decision-making itself.

`signUpWithEmail` is updated to drop `emailRedirectTo` from the `options`. `resendVerificationEmail` is unchanged.

### D10. Type / mapper / select / route-constants updates

- `User` interface (`apps/web/src/user/model/User.ts`): add `kakaoId: string | null`, `onboardingComplete: boolean` (default `false`).
- `UserOptionalFields` and `UserRequiredFields`: extend accordingly.
- `userMappers.ts`: `mapUserToSupabaseUpdate` adds mappings for `kakaoId → kakao_id` and `onboardingComplete → onboarding_complete`. `SupabaseUserUpdate` type adds the new fields.
- `apps/web/src/shared/api/supabaseReads.ts` (canonical `select()` location used by `fetchUserFromSupabase`): add `kakao_id, onboarding_complete` to the column list. (Earlier draft pointed at `apps/web/src/user/api/user.ts`, which only re-exports.)
- `apps/web/src/login/constants.ts`: add `ROUTES.ONBOARDING = '/join/onboarding'` and `ROUTES.JOIN_COMPLETE = '/join/complete'`. All callers (router, OnboardingPage, JoinDispatcher, RootRedirect) reference these constants instead of string literals — consistent with how `ROUTES.JOIN_FORM` is already used.
- **Retained** (not deleted, despite being adjacent to deletions): `apps/web/src/login/components/JoinFormHeader.tsx` is also imported by `JoinFormPageForActiveUser.tsx`. Keep it.
- **Cleanup** (delete after primary work): `apps/web/src/login/model/join.ts` `JoinFormDataForNewUser` type — only consumed by deleted files. Delete the type but leave the file if other types remain there.
- **Cleanup** (in `RootRedirect.tsx`): remove the `useUserNickname` import once the `joinComplete` render branch is gone. The hook itself stays — `PostFreewritingPage.tsx` still uses it.

## Risks / Trade-offs

- **[Risk] Auto-link doesn't work via verifyOtp** → spike (D1) decides path.
- **[Risk] Production dashboard email template not flipped before deploy** → canary signup task in release checklist (D7).
- **[Risk] Backfill marks users incorrectly as onboarded** → backfill criteria is conservative (require existing contact info or membership signal); if wrong, a small set of users see the onboarding page once, which is recoverable.
- **[Risk] CHECK constraint blocks E2E seeds or admin updates** → seed scripts and admin runbooks must populate `phone_number` or `kakao_id` whenever they set `onboarding_complete = true`. Documented in D6 and tasks.md.
- **[Risk] Race window between migration apply and code deploy** → users signing up in the window go through old magic-link, then on next login land on `/join/onboarding`. Acceptable one-time UX glitch (proposal trade-off).
- **[Trade-off] Single PR rollback unit** → entire feature reverts at once; we accept this in exchange for tested integration of all parts.
- **[Trade-off] No "kakao_id" backfill prompt for pre-existing users** → organizer cannot use Kakao for invitations to those users until follow-up ships.

## Migration Plan

1. Run spike from D1 in local Supabase Docker. Branch the implementation strategy based on result.
2. Apply DB migration (D6) via `supabase db push`. Verify backfill numbers match expectations on staging.
3. Land all code changes (per `tasks.md`).
4. Update production Supabase dashboard email template manually before merging the deploy.
5. Run canary signup test against production with a sentinel email; verify OTP arrives and works.
6. Merge / deploy.

**Rollback strategy:** the migration is forward-additive (only adds columns + constraint + sets a flag). Rollback steps if signup is broken post-deploy:
- Revert the application deploy (UI returns to magic-link UI).
- Revert the dashboard email template back to magic-link.
- Leave DB columns in place; they're harmless to the old code.
- The CHECK constraint is the only concern; if a hot-fix needs to set `onboarding_complete = true` on rows lacking contact info, drop the constraint with `ALTER TABLE users DROP CONSTRAINT users_contact_required_when_onboarded;` and re-add later.

## Open Questions

- **Persona F empty-state on `/boards`** — should we add a small banner ("N기 신청 완료 — 시작 하루 전에 연락드려요") to `/boards` for users in waiting list with no active cohort? Decision deferred until design-review; current default is "no banner, keep this PR scoped."
- **Production dashboard automation** — should we author a one-off Supabase Management API script for the template flip, or accept the manual-checklist approach? Default is manual.
- **Persona D existing Google users without `kakao_id`** — should the onboarding page also be the place these users add Kakao if the organizer needs it later? Default is "no — they're backfilled as complete, follow-up ticket handles their case."

## Testability Notes

### Unit (Layer 1 — Vitest)

Pure logic with branching, edge cases, boundary values. No external dependencies.

- **`resolveRootRedirect`** in `apps/web/src/shared/utils/routingDecisions.ts`: existing test file `routingDecisions.test.ts` extended.
  - New input fields: `onboardingComplete`, `hasUpcomingCohort`.
  - New branches to cover:
    - not loading + user + not active + not in waiting list + `onboardingComplete=false` → `/join/onboarding`
    - not loading + user + not active + not in waiting list + `onboardingComplete=true` → `/join`
    - not loading + user + not active + in waiting list (any onboarding state) → `/boards`
  - Removed: `joinComplete` result-type test cases (delete those).

- **Phone/Kakao validation** (new pure helpers in `apps/web/src/login/utils/contactValidation.ts`):
  - `validatePhone(input: string): string | null` — strips non-digits, returns digits-only string if 10–11 chars, else null.
  - `validateKakaoId(input: string): string | null` — trim, return string if non-empty and ≤50 chars, else null.
  - Test cases: empty, whitespace-only, 9 digits, 10 digits, 11 digits, 12 digits, mixed punctuation `010-1234-5678`, leading/trailing spaces, 51-char Kakao ID, kakao with emoji.

- **Backfill criterion as a documented SQL function** — included in migration file; verified manually against staging dataset (no unit test for raw SQL).

- **`resolveOnboardingSubmit`** in `apps/web/src/login/utils/onboardingSubmit.ts`: takes plain `OnboardingFormValues` + `OnboardingSubmitContext` (no hook references — see D3 for pinned signature). Returns `OnboardingSubmitAction` discriminated union. Tested for all 4 input combinations (cohort exists/null × phone tab / kakao tab).

- **`decideVerifySuccessState`** in `apps/web/src/login/utils/verifyEmailState.ts`: takes `VerifyOtpOutcome`, returns `VerifyState`. Tested for: (1) ok+google+email providers → `success-linked`, (2) ok+email only → `success`, (3) errorCode `rate_limit` → `locked`, (4) errorCode `expired` → `error-inline` with expired copy, (5) errorCode `invalid_token` → `error-inline` with invalid copy, (6) errorCode `unknown` → `error-inline` with generic copy.

- **`classifySupabaseAuthError`** in `apps/web/src/shared/auth/supabaseAuth.ts`: pure mapping from Supabase error shape to canonical `errorCode`. Tested with the exact error fixtures captured during the D1 spike.

### Integration (Layer 2 — Vitest)

Boundary contracts. One boundary at a time.

- **`mapUserToSupabaseUpdate`**: extend existing test (if any) or add one. Verify `kakaoId` → `kakao_id`, `onboardingComplete` → `onboarding_complete`. Snapshot mapping for backward compatibility on existing fields.

- **`verifyOtpForSignup`**: skip — wraps Supabase SDK, no logic to test.

- **`updateUser` ↔ Supabase**: covered by existing tests if present. Verify writing both new columns updates the row.

### E2E Network Passthrough (Layer 3 — agent-browser + dev3000)

Full UI flow. Internal Supabase uses local dev server. External services mocked.

- **Skipped intentionally; coverage moved to Layer 4.** The signup→verify-email→onboarding→complete journey requires the email queue (Inbucket) to deliver an OTP, which is a DB/infrastructure dependency. Layer 4 covers it. A Layer-3 test that mocks Inbucket would re-test only react-hook-form bindings already covered by `resolveOnboardingSubmit` and `decideVerifySuccessState` units, with no incremental signal.

- **One exception — `/verify-email` state machine**: covered by Vitest+RTL component test (technically Layer 2-ish) that drives the component through each `VerifyState` by feeding the result of `decideVerifySuccessState` directly. Not a true E2E.

### E2E Local DB (Layer 4 — agent-browser + Supabase local Docker)

Only DB-dependent scenarios.

**Prerequisite (tracked in tasks.md as task 1):** confirm whether the existing E2E suite has Inbucket-inbox-reading tooling. If not, add a small helper in `tests/e2e/utils/inbucket.ts` that polls `http://127.0.0.1:54324/api/v1/mailbox/<email>/messages` and extracts the OTP token from the most recent message. Without this helper, none of the Layer 4 OTP tests can run.

- **OTP signup happy-path**: new test under `tests/e2e/`. Sign up new email/password → read OTP from local Inbucket via the helper → enter on `/verify-email` → land on `/join/onboarding`. Validates the wiring across `signUpWithEmail`, email template, `verifyOtpForSignup`, `RootRedirect`.

- **Auto-link signup (Persona B) — only added if D1 spike confirms feasibility**: pre-create Google user, run signup with same email, verify `data.user.identities` includes both `email` and `google` providers after OTP, auto-link banner shows.

- **CHECK constraint enforcement**: SQL test asserts that `UPDATE users SET onboarding_complete = true WHERE id = '<row with no phone or kakao>'` raises constraint violation.

- **Backfill correctness**: SQL test against a seeded dataset with mixed contact-info presence; assert exactly the expected rows have `onboarding_complete = true` post-migration.

- **`kakao_id` format CHECK**: SQL test asserts that `UPDATE users SET kakao_id = '<script>alert(1)</script>'` raises violation; `UPDATE users SET kakao_id = 'valid_id-123'` succeeds.

- **dev3000 timeline**: capture during E2E happy-path to surface any unexpected redirects or auth state churn during the new `/verify-email → /join/onboarding` hop.
