# Integrated Signup + Cohort-Join Flow — Design Document

**Date:** 2026-05-05
**Branch:** enhancing-email-and-password-login-feature

---

## 1. Goal + Non-Goals

**Goal:** Collapse the two first-time-user funnels (auth signup + cohort join) into a single linear journey. A user who creates an account ends up on the cohort waiting list in one flow, with no ambiguity about where to go next.

**Non-goals:**
- Changing how admin grants `boardPermissions: write` (that stays a manual admin action).
- Replacing the Google OAuth mechanism — only the post-auth routing changes.
- Removing `JoinIntroPage` (`/join`) — it remains the public marketing/landing page.
- Implementing OTP mechanics end-to-end (separate ticket); this doc treats OTP as a given, describes where it fits in the flow.
- Changing the active-user re-join flow (`JoinFormPageForActiveUser`) — that is a returning-user path and stays largely intact.

---

## 2. User Journeys

### Persona A — New email/password user, fresh email

```
/join                  →  [신청하기 CTA]
/signup                →  email + password form  →  submit
/verify-email          →  "OTP를 입력해주세요" (6-digit code, same tab)
   [OTP correct → Supabase confirms email → session starts]
/join/onboarding       →  profile form (real_name 필수, nickname 필수,
                          phone_number 필수, referrer 선택)
                       +  cohort card ("N기 신청하기")  →  submit
/join/complete         →  "신청 완료"  →  "게시판 보기"  →  /boards
```

### Persona B — Email user whose address already has Google identity (Supabase auto-link)

```
/signup                →  submit  →  Supabase returns already_registered
   (current code already funnels this to /verify-email)
/verify-email          →  OTP entry
   [OTP correct → identities linked → session starts]
/join/onboarding       →  same as Persona A
   (real_name pre-filled from Google displayName, phone_number blank)
/join/complete
```

### Persona C — New Google user (OAuth, never seen the app)

```
/join                  →  [신청하기 CTA]  →  /login  →  "구글로 로그인하기"
   [OAuth round-trip → SIGNED_IN → useAuth creates public.users stub]
   RootRedirect detects: not on waiting list + not active
   → redirect /join/onboarding
/join/onboarding       →  profile + cohort card  →  submit
/join/complete         →  /boards
```

### Persona D — Returning Google user, no cohort, partial profile

```
/login                 →  Google login  →  session restored
   RootRedirect: useIsCurrentUserActive false, useIsUserInWaitingList false,
                  phone_number null
   → redirect /join/onboarding
```

If they previously dismissed the form (pre-integration era), `public.users` row exists but `phone_number` is null. Onboarding pre-fills available data, highlights missing required fields.

### Persona E — Returning user with active cohort

```
/login                 →  session  →  /boards  (no change)
```

No interruption. `/join` still available for re-applying for the next cohort via `/join/form/active-user`.

### Persona F — Returning user already on waiting list

```
/login                 →  session
   RootRedirect: isInWaitingList true
   → /boards  (no interruption)
```

`/join` CTA shows "신청 완료" state (already handled by `IntroCTA`).

---

## 3. Route Inventory

| Route | Current Component | Status | Notes |
|---|---|---|---|
| `/join` | `JoinIntroPage` | Keep | Public marketing page, unchanged |
| `/join/form` | `JoinFormPageForActiveOrNewUser` | Delete | Dispatcher replaced by `RootRedirect` logic |
| `/join/form/new-user` | `JoinFormPageForNewUser` | Delete | Replaced by `/join/onboarding` |
| `/join/form/active-user` | `JoinFormPageForActiveUser` | Keep | Re-join flow for active users (separate concern) |
| `/join/onboarding` | `OnboardingPage` (new) | New | Profile + cohort signup combined; private route |
| `/join/complete` | `JoinCompletePage` (existing, route promoted) | Promote | Currently rendered inline; promote to its own route |
| `/signup` | `SignupPage` | Keep, minor edit | Drop `emailRedirectTo` from `signUpWithEmail` (OTP doesn't need it) |
| `/verify-email` | `VerifyEmailPage` | Rewrite | Replace "check inbox" UI with 6-digit OTP entry form |
| `/login` | `LoginPage` | Minor edit | Post-login `useEffect` adds onboarding redirect via RootRedirect |
| `/boards` | `RecentBoard` | Keep | Unchanged |
| `/forgot-password` | `ForgotPasswordPage` | Keep | Unchanged |
| `/set-password` | `SetPasswordPage` | Keep | Unchanged |

**Router file:** `apps/web/src/router.tsx`

Changes:
- Add `{ path: 'join/onboarding', element: <OnboardingPage /> }` under `privateRoutesWithoutNav`.
- Add `{ path: 'join/complete', element: <JoinCompletePage /> }` under `privateRoutesWithoutNav`.
- Remove `join/form` and `join/form/new-user` routes (keep `join/form/active-user`).

---

## 4. Component Design

### `OnboardingPage` (new)
**File:** `apps/web/src/login/components/OnboardingPage.tsx`

Responsibilities:
- Reads `currentUser` from `useAuth`.
- Fetches `upcomingBoard` via `useUpcomingBoard`.
- Reads `useIsUserInWaitingList` — if already on list, redirects to `/boards`.
- Renders profile form fields: `real_name` (required), `nickname` (required), **contact info** (required — see Section 8), `referrer` (optional). Pre-fills from `public.users` row if data exists.
- Below the form: cohort card built from `upcomingBoard`. If null, shows "현재 신청 가능한 기수가 없어요. 프로필만 저장하고 나중에 신청할 수 있어요." and allows profile-only save.
- On submit:
  1. `updateUser(uid, { ...profileData, onboardingComplete: true })`
  2. If `upcomingBoard` exists: `addUserToBoardWaitingList(upcomingBoard.id, uid)`
  3. Navigate to `/join/complete` with cohort + name in route state.
- Reuses or replaces `JoinFormCardForNewUser` — see open question 2.

Props: none (reads from context/hooks).

### `VerifyEmailPage` (rewrite)
**File:** `apps/web/src/login/components/VerifyEmailPage.tsx`

Responsibilities:
- 6-digit OTP input + Resend button.
- Submits via new helper `verifyOtpForSignup(email, token)` that wraps `supabase.auth.verifyOtp({ email, token, type: 'signup' })`.
- On success: `useAuth.onAuthStateChange` fires SIGNED_IN; component navigates to `/join/onboarding`.
- Resend uses existing `resendVerificationEmail` (no change to that function).
- OTP expiration (1 hour default): inline error "인증 코드가 만료되었습니다. 다시 받기를 눌러주세요."

### `RootRedirect` (modify)
**File:** `apps/web/src/shared/components/auth/RootRedirect.tsx`

Add post-login routing logic:
- After `currentUser` is set, check `useIsCurrentUserActive` AND `useIsUserInWaitingList` AND `users.onboarding_complete`.
- If user is not active, not on waiting list, and `onboarding_complete = false`: redirect to `/join/onboarding`.
- Otherwise, current `/boards` behavior.

This handles Google OAuth users landing at `/` after their OAuth round-trip and email/password users landing after `/verify-email`.

---

## 5. Data Flow

```
AUTH STATE
  Supabase onAuthStateChange  →  useAuth (AuthContext)
  →  SIGNED_IN: createUserIfNotExists(authUser)        [useAuth.tsx:54]
     writes public.users stub: uid, email, displayName (Google), photoURL

PROFILE STATE                                          [OnboardingPage]
  read:   fetchUser(uid)                               (pre-fill form)
  write:  updateUser(uid, { realName, nickname,
                            phoneNumber, kakaoId,      (one is null)
                            referrer,
                            onboardingComplete: true })

WAITING-LIST STATE       [RootRedirect, OnboardingPage, JoinIntroPage]
  read:   useIsUserInWaitingList                       (upcomingBoard.waitingUsersIds.includes(uid))
  write:  addUserToBoardWaitingList(upcomingBoard.id, uid)   [OnboardingPage submit]

BOARD PERMISSION STATE                                  [admin only]
  write:  manual admin action  →  user_board_permissions
  read:   useIsCurrentUserActive  →  fetchUsersWithBoardPermission([activeBoardId])
```

Sequence (email/password new user):
1. `/signup` → `signUpWithEmail` → Supabase queues OTP email, returns unconfirmed user (no session yet).
2. `/verify-email` → user types OTP → `verifyOtp` → session created → `onAuthStateChange(SIGNED_IN)` fires.
3. `createUserIfNotExists` runs (stub row in `public.users`, race-safe).
4. Navigate to `/join/onboarding`.
5. User submits form → `updateUser` + `addUserToBoardWaitingList`.
6. Navigate to `/join/complete` → "게시판 보기" → `/boards`.

---

## 6. Edge Cases

**No upcoming cohort (`useUpcomingBoard` returns null)**
`OnboardingPage` still shows profile form. Cohort card replaced with notice. Submit saves profile only, no waitlist call. User lands on `/boards` with read-only access until next cohort opens.

**Auto-linked accounts (Persona B)**
`signUpWithEmail` returns `already_registered`; `SignupPage` already routes to `/verify-email`. OTP confirms identity, Supabase links the password identity to the existing Google identity. Session starts. `createUserIfNotExists` is idempotent (upsert + ignoreDuplicates), no duplicate row. Flow continues to `/join/onboarding`.

**Partial profile (returning Google user, Persona D)**
`OnboardingPage` calls `fetchUser(uid)` and pre-fills available fields. Required fields show empty if absent. User must complete to submit.

**Already on waiting list landing at `/join/onboarding`**
`useIsUserInWaitingList` true → immediate redirect to `/boards`. Prevents double submission.

**OTP expiration**
`verifyOtp` returns `Token has expired or is invalid`. Show inline error with resend prompt. Resend calls `resendVerificationEmail(email)`.

**Google user dismisses `/join/onboarding`**
"나중에 하기" link saves nothing — `onboarding_complete` stays `false`. `RootRedirect` re-triggers onboarding on the next login. "Nudge, not hard gate" semantics applied to profile; cohort signup itself is not forced but cannot be skipped mid-flow without losing board write access.

---

## 7. Resolved Decisions

1. **Onboarding-completion signal: dedicated `onboarding_complete` boolean column on `public.users`.** Add a Supabase migration with default `false`. `updateUser` writes `true` on successful `OnboardingPage` submit. `RootRedirect` reads this value (not `phone_number`).

2. **`JoinFormCardForNewUser`: delete and rebuild from scratch in `OnboardingPage`.** New form must follow the project design system (consult `.claude/skills/daily-writing-friends-design`) — design tokens, button hierarchy, dark-mode parity, accessibility. No legacy field layout carried forward.

3. **`/join/complete`: own route.** Add `/join/complete` to the router as `privateRoutesWithoutNav`. `OnboardingPage` navigates with cohort + name in route state on submit success. Inline rendering inside `JoinFormPageForNewUser` is removed alongside that file.

4. **Existing Google users with `onboarding_complete = false`** (i.e., everyone before this migration unless backfilled) will be re-routed to `/join/onboarding` on next login. Accepted UX. Backfill plan: a one-line SQL migration sets `onboarding_complete = true` for users who already have a board permission OR a waiting-list entry, so only truly-incomplete users see the onboarding page.

5. **Supabase email template switch (magic link → OTP) is in scope for this branch.** Update both:
   - `supabase/config.toml` for local dev (template + `enable_confirmations`).
   - Production Supabase dashboard email template (manual step before deploy).

   Document the dashboard step in the implementation plan so it isn't forgotten.

---

## 8. Contact Method Choice (phone OR Kakao ID)

**Why:** the cohort organizer invites participants to the KakaoTalk group chat. Either a Kakao-linked phone number or a Kakao ID works. Forcing phone-only excludes users who don't want to share their number.

### Schema change

Add `kakao_id` column to `public.users`. Both `phone_number` and `kakao_id` nullable; DB constraint requires at least one to be non-null **only when `onboarding_complete = true`** (so users mid-flow aren't blocked).

```sql
ALTER TABLE users ADD COLUMN kakao_id TEXT;
ALTER TABLE users ADD CONSTRAINT users_contact_required_when_onboarded
  CHECK (NOT onboarding_complete OR phone_number IS NOT NULL OR kakao_id IS NOT NULL);
```

### UI: segmented control / tabs

```
[ 전화번호 ]  [ 카카오 ID ]
┌────────────────────────────┐
│ 010-1234-5678              │
└────────────────────────────┘
* 코호트 카톡방 초대를 위해 카톡 연결된 번호로 입력해주세요.
```

- Two tabs at the top: `전화번호` / `카카오 ID`. Default = `전화번호`.
- Only the active tab's input is visible.
- Switching tabs clears the inactive field's form state on submit (the inactive value is sent as `null`).
- Helper text below the input explains why we need it (KakaoTalk invitation).

### Validation

- **Phone:** any 10–11 digits. Strip non-digits before storing. No Korean-mobile prefix gate (supports landline / overseas just in case).
- **Kakao ID:** non-empty trimmed string, max 50 chars. No format check.
- Submit-time gate: `if (activeTab === 'phone' ? !phoneNumber : !kakaoId) → form error`. The DB constraint is the safety net.

### Existing users

Pre-existing rows have `phone_number` populated and `kakao_id = null`. The check constraint accepts that. Backfill migration sets `onboarding_complete = true` for already-active users (see Section 7 #4), so the constraint won't bite them. Users on `/join/onboarding` see the phone-tab pre-filled with their existing `phone_number`; switching to the Kakao tab clears the phone value on submit.

### Mapper updates

- `apps/web/src/user/utils/userMappers.ts` — `mapUserToSupabaseUpdate` adds `kakao_id` mapping.
- `User` interface (`apps/web/src/user/model/User.ts`) — add `kakaoId: string | null`.
- `fetchUserFromSupabase` `select(...)` — add `kakao_id` column.

### Out of scope for this design

The admin-side workflow (how the organizer reads contact info to send invitations) — assumed unchanged. The admin already reads `phone_number`; they will now also need to check `kakao_id`. Track as a follow-up.
