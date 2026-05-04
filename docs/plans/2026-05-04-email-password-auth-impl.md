# Email/Password Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
>
> **Required project skills:** `daily-writing-friends-design` (UI), `react-component`, `code-style`, `testing`, `commit`. Invoke each at the relevant phase.
>
> **Design spec:** `docs/plans/2026-05-04-email-password-auth-design.md` — read first.

**Goal:** Add email/password sign-in alongside existing Google OAuth so users blocked from Google at work can still access their account.

**Architecture:** Supabase Auth with automatic identity linking (default behavior — verified-email gate prevents takeover). Two main paths: (1) net-new `/signup` → email verification → login; (2) existing Google user adds password from Settings via `updateUser({ password })` (no email round-trip needed since they're already authenticated). Password reset is a separate `/forgot-password` → `/set-password` flow. Six new routes, one `LoginPage` rewrite, one Settings row addition, one `IntroCTA` cleanup.

**Tech Stack:** React 18, react-router-dom v6 (data router in `apps/web/src/router.tsx`), Supabase JS SDK (already wired), Tailwind + shadcn UI (`@/shared/ui/*`), `react-hook-form` + zod (existing pattern in `JoinFormField`), `sonner` for toasts, `vitest` for tests.

---

## Pre-flight

- **Worktree:** Create one for this work — `git worktree add .claude/worktrees/email-password-auth -b feat/email-password-auth main`. All tasks below run inside that worktree.
- **Local Supabase:** Per memory `project_local_supabase.md`, apply all migrations + handle notification triggers before booting the dev server. Verify the auth schema is intact: `supabase db reset --local` then `pnpm dev` from `apps/web`.
- **Email provider:** Local Supabase ships with Inbucket on `localhost:54324` — verification emails land there. Production uses the configured SMTP. Confirm both endpoints work before Phase 5.

---

## Phase 1 — Core auth functions and constants

### Task 1.1: Add password validator (TDD)

**Files:**
- Create: `apps/web/src/login/utils/passwordValidation.ts`
- Test: `apps/web/src/login/utils/passwordValidation.test.ts`

**Why pure function:** Per `testing` skill, output-based testing applies to pure functions only. Validation rules are pure → fully testable.

**Step 1: Write the failing test**

```ts
// passwordValidation.test.ts
import { describe, it, expect } from 'vitest';
import { validatePassword, passwordChecks } from './passwordValidation';

describe('passwordChecks', () => {
  it('returns all checks for empty input', () => {
    expect(passwordChecks('')).toEqual({
      isLongEnough: false,
      hasLetter: false,
      hasNumber: false,
    });
  });

  it('flags 8+ chars', () => {
    expect(passwordChecks('abcd1234').isLongEnough).toBe(true);
    expect(passwordChecks('abc12').isLongEnough).toBe(false);
  });

  it('flags letter presence', () => {
    expect(passwordChecks('12345678').hasLetter).toBe(false);
    expect(passwordChecks('abc12345').hasLetter).toBe(true);
  });

  it('flags number presence', () => {
    expect(passwordChecks('abcdefgh').hasNumber).toBe(false);
    expect(passwordChecks('abcd1234').hasNumber).toBe(true);
  });
});

describe('validatePassword', () => {
  it('returns null when all rules pass', () => {
    expect(validatePassword('abcd1234')).toBeNull();
  });

  it('returns Korean message when too short', () => {
    expect(validatePassword('ab12')).toBe('비밀번호는 8자 이상이어야 합니다.');
  });

  it('returns Korean message when missing letter', () => {
    expect(validatePassword('12345678')).toBe('비밀번호는 영문을 포함해야 합니다.');
  });

  it('returns Korean message when missing number', () => {
    expect(validatePassword('abcdefgh')).toBe('비밀번호는 숫자를 포함해야 합니다.');
  });
});
```

**Step 2: Run — expect failure**

Run: `pnpm --filter web test -- passwordValidation`
Expected: FAIL (file not found).

**Step 3: Implement**

```ts
// passwordValidation.ts
export interface PasswordChecks {
  isLongEnough: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
}

export function passwordChecks(password: string): PasswordChecks {
  return {
    isLongEnough: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
  };
}

export function validatePassword(password: string): string | null {
  const checks = passwordChecks(password);
  if (!checks.isLongEnough) return '비밀번호는 8자 이상이어야 합니다.';
  if (!checks.hasLetter) return '비밀번호는 영문을 포함해야 합니다.';
  if (!checks.hasNumber) return '비밀번호는 숫자를 포함해야 합니다.';
  return null;
}
```

**Step 4: Run — expect pass**

**Step 5: Commit**

```
비밀번호 유효성 검증 유틸 추가

- 회원가입/비밀번호 변경 화면이 동일한 규칙(8자, 영문, 숫자)을 공유하기 위함
- 순수 함수로 분리해 화면별 중복 없이 단위 테스트로 보호
```

---

### Task 1.2: Extend `ROUTES` constants

**Files:**
- Modify: `apps/web/src/login/constants.ts`

**Step 1: Add new keys**

```ts
export const ROUTES = {
  BOARDS: '/boards',
  JOIN: '/join',
  JOIN_FORM: '/join/form',
  LOGIN: '/login',
  SIGNUP: '/signup',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  SET_PASSWORD: '/set-password',
  ADD_PASSWORD: '/settings/add-password',
  CHANGE_PASSWORD: '/settings/change-password',
} as const;
```

**Step 2: Replace literal strings in `IntroCTA.tsx`**

Replace `ROUTES.JOIN` and `ROUTES.BOARDS` references — already use the constant. No change needed beyond adding new keys.

**Step 3: Commit**

```
인증 관련 라우트 상수 추가

- 새 화면(/signup, /verify-email, /forgot-password 등)을 한 곳에서 관리
- 하드코딩된 경로 문자열로 인한 오타 가능성 제거
```

---

### Task 1.3: Add Supabase auth functions (TDD where it's pure)

**Files:**
- Modify: `apps/web/src/shared/auth/supabaseAuth.ts`
- Modify: `apps/web/src/shared/auth/supabaseAuth.test.ts`

**Per `testing` skill:** These functions are imperative shell wrappers (network calls). Don't test them directly. The `mapToAuthUser` tests (already there) cover the pure mapping logic. New thin wrappers don't need tests at this layer — coverage comes from manual E2E in Phase 9.

**Step 1: Add new functions — append to `supabaseAuth.ts`**

```ts
/**
 * Sign up with email + password. Triggers Supabase verification email.
 * Auto-links to existing identity if email matches a verified user.
 */
export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}${ROUTES.LOGIN}` },
  });
  if (error) throw error;
}

/**
 * Sign in with email + password.
 * Throws "Email not confirmed" when verification is pending.
 */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Send password reset link. Redirects user back to /set-password with token.
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${ROUTES.SET_PASSWORD}`,
  });
  if (error) throw error;
}

/**
 * Resend the verification email for an unconfirmed signup.
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

/**
 * Set or change the password for the currently authenticated user.
 * Used by Settings flow — requires active session.
 */
export async function setPasswordForCurrentUser(newPassword: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
```

Add `import { ROUTES } from '@/login/constants';` at top.

**Step 2: Verify nothing broke**

Run: `pnpm --filter web test -- supabaseAuth`
Expected: existing `mapToAuthUser` tests still pass.

**Step 3: Type check**

Run: `pnpm --filter web tsc --noEmit`
Expected: PASS.

**Step 4: Commit**

```
Supabase 이메일/비밀번호 인증 함수 추가

- 신규 가입, 로그인, 재설정, 인증 메일 재발송, 로그인 상태에서 비밀번호 설정
- 모두 Supabase SDK의 얇은 래퍼; 테스트는 E2E 단계에서 보강
```

---

## Phase 2 — Route scaffolding

### Task 2.1: Add stub pages and wire routes

Why first: avoids breaking `pnpm tsc` while building each screen.

**Files:**
- Create stubs: `SignupPage.tsx`, `VerifyEmailPage.tsx`, `ForgotPasswordPage.tsx`, `SetPasswordPage.tsx` under `apps/web/src/login/components/`
- Create stubs: `AddPasswordPage.tsx`, `ChangePasswordPage.tsx` under `apps/web/src/user/components/`
- Modify: `apps/web/src/router.tsx`

**Step 1: Stub component template** (apply to each)

```tsx
export default function SignupPage() {
  return <div>Signup — TODO</div>;
}
```

Use the same shape for all six.

**Step 2: Add to `router.tsx`**

In `publicRoutes.children`:
```tsx
{ path: 'signup', element: <SignupPage /> },
{ path: 'verify-email', element: <VerifyEmailPage /> },
{ path: 'forgot-password', element: <ForgotPasswordPage /> },
{ path: 'set-password', element: <SetPasswordPage /> },
```

In `privateRoutesWithoutNav.children`:
```tsx
{ path: 'settings/add-password', element: <AddPasswordPage /> },
{ path: 'settings/change-password', element: <ChangePasswordPage /> },
```

Add the imports at top.

**Step 3: Verify**

Run: `pnpm --filter web tsc --noEmit && pnpm --filter web build`
Expected: PASS, all six routes resolvable.

**Step 4: Commit**

```
이메일 인증 신규 라우트 스캐폴딩

- 6개 화면 stub 추가, router에 등록
- 다음 단계의 단계적 구현 시 타입체크/빌드 깨짐을 방지
```

---

## Phase 3 — `/login` upgrade

> **Invoke `daily-writing-friends-design` skill before this phase.** All UI follows the design system tokens, button hierarchy, and Korean tone documented there.

### Task 3.1: Create `useEmailLogin` hook

**Files:**
- Create: `apps/web/src/login/hooks/useEmailLogin.ts`

**Step 1: Implement** (mirrors `useGoogleLoginWithRedirect` shape)

```ts
import { useState, useCallback } from 'react';
import { signInWithEmail } from '@/shared/auth/supabaseAuth';

export function useEmailLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleLogin = useCallback(async (email: string, password: string, returnTo?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      if (returnTo) sessionStorage.setItem('returnTo', returnTo);
      await signInWithEmail(email, password);
    } catch (err) {
      const message = mapAuthErrorToKorean(err);
      setError(new Error(message));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { handleLogin, isLoading, error };
}

function mapAuthErrorToKorean(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  if (msg.includes('email not confirmed')) return '이메일 인증이 필요합니다.';
  if (msg.includes('invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  return '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.';
}
```

`mapAuthErrorToKorean` is pure → cover with a small test file alongside.

**Step 2: Test the pure error mapper**

```ts
// useEmailLogin.test.ts (test only the pure helper — export it)
import { mapAuthErrorToKorean } from './useEmailLogin';
// ... assertions for each branch
```

(Export `mapAuthErrorToKorean` from the module so tests can target it directly.)

**Step 3: Run tests, type check, commit**

```
이메일 로그인 hook 추가

- 기존 useGoogleLoginWithRedirect와 동일한 형태(loading/error/handleLogin)
- Supabase 에러 메시지를 한국어 문구로 매핑하는 순수 함수 분리 + 테스트
```

---

### Task 3.2: Rewrite `LoginPage`

**Files:**
- Modify: `apps/web/src/login/components/LoginPage.tsx`

**Reference:** Design doc section 1 for the exact layout. Use `JoinFormField` for inputs.

**Step 1: Replace the file with the design-spec layout**

Key elements (full code intentionally omitted from this plan — follow design doc faithfully):
- Existing card frame (`reading-shadow w-full max-w-md border-border/50`)
- Optional Kakao banner (read `navigator.userAgent.toLowerCase().includes('kakaotalk')`)
- Google button on top (`variant="default"`, existing copy "구글로 로그인하기")
- Divider with "또는"
- `react-hook-form` form with email + password using `JoinFormField`
- "이메일로 로그인" submit button (`variant="default"`)
- Footer: "비밀번호를 잊으셨나요?" `Link to={ROUTES.FORGOT_PASSWORD}` (left) and "회원가입" `Link to={ROUTES.SIGNUP}` (right) — both `text-ring hover:underline`
- Inline error from `useEmailLogin().error` shown above the submit button
- Loading state on the active button only (Google or email — separate `isLoading` flags)

**Step 2: Manual smoke test**

Boot dev server. Navigate to `/login`. Click Google → existing flow still works. Try email/password against a local seeded user → succeeds. Try wrong password → Korean error shown.

**Step 3: Commit**

```
/login에 이메일 로그인 폼 추가

- 기존 Google 버튼 위에 두고, "또는" 구분선으로 두 옵션을 한 화면에 노출
- KakaoTalk 인앱 브라우저에서 이메일 로그인을 권장하는 인라인 배너 추가
- 비밀번호 찾기와 회원가입 진입점을 푸터에 명확히 배치
```

---

## Phase 4 — `/signup` flow

### Task 4.1: `PasswordRequirements` live-checks component

**Files:**
- Create: `apps/web/src/login/components/PasswordRequirements.tsx`

Renders ✓/○ rows for `passwordChecks(password)` from Phase 1. Hidden when `password === ''`.

```tsx
import { passwordChecks } from '@/login/utils/passwordValidation';

export function PasswordRequirements({ password }: { password: string }) {
  if (!password) {
    return <p className="text-xs text-muted-foreground">8자 이상, 영문과 숫자를 포함해주세요.</p>;
  }
  const checks = passwordChecks(password);
  const rules: Array<[boolean, string]> = [
    [checks.isLongEnough, '8자 이상'],
    [checks.hasLetter, '영문 포함'],
    [checks.hasNumber, '숫자 포함'],
  ];
  return (
    <ul className="space-y-1 text-xs">
      {rules.map(([ok, label]) => (
        <li key={label} className={ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
          {ok ? '✓' : '○'} {label}
        </li>
      ))}
    </ul>
  );
}
```

**Commit:**
```
PasswordRequirements 컴포넌트 추가

- 입력 중 실시간 체크리스트로 빈 상태 에러 노이즈 제거
- 회원가입과 비밀번호 설정 화면에서 공통 사용
```

---

### Task 4.2: `SignupPage`

**Files:**
- Modify: `apps/web/src/login/components/SignupPage.tsx`

Layout per design doc section 2. Form with `react-hook-form` + zod. Three fields: email, password, password confirmation. CTA button. On success: `navigate('/verify-email', { state: { email } })`.

Error mapping additions for signup:
- `User already registered` → 한국어: "이미 가입된 이메일입니다. 로그인해주세요."

**Manual test:** Submit a fresh email → ends on `/verify-email` showing the email. Inbucket (`localhost:54324`) shows the verification mail.

**Commit:**
```
/signup 화면 구현

- 이메일/비밀번호/확인 입력, 실시간 비밀번호 요구사항 표시
- 가입 성공 시 /verify-email로 이동, 입력한 이메일을 state로 전달
```

---

## Phase 5 — `/verify-email`

### Task 5.1: Verify-email waiting screen with cooldown

**Files:**
- Modify: `apps/web/src/login/components/VerifyEmailPage.tsx`

Per design doc section 3. Email read from `location.state.email` or `sessionStorage`. Resend button with 30s cooldown (`useState` for `cooldown` + `setInterval`).

`onAuthStateChange` already runs in `useAuth` — when the user clicks the verification link in the same browser, the global session listener picks it up and `RootRedirect` handles navigation. No polling needed in this page.

Manual test:
1. Sign up with a fresh email.
2. Land on `/verify-email`.
3. Open Inbucket, click verification link.
4. App auto-redirects to home (or `returnTo` target).

**Commit:**
```
/verify-email 대기 화면 구현

- 인증 메일 발송 안내, 30초 쿨다운 후 재발송 버튼 활성화
- onAuthStateChange가 같은 브라우저 인증 클릭을 자동 처리하므로 별도 폴링 없음
```

---

## Phase 6 — Password reset

### Task 6.1: `/forgot-password` request page

**Files:**
- Modify: `apps/web/src/login/components/ForgotPasswordPage.tsx`

Single email input → calls `sendPasswordResetEmail(email)` → success state: "비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해주세요." with a back-to-login button.

**Security note:** Don't disclose whether the email exists — show the success message even when the address is unknown (Supabase already does this, but mirror the UX).

**Commit:**
```
/forgot-password 화면 구현

- 이메일만 입력받고 즉시 성공 안내 (계정 존재 여부 노출 안 함)
- Supabase resetPasswordForEmail 호출
```

---

### Task 6.2: `/set-password` reset confirmation

**Files:**
- Modify: `apps/web/src/login/components/SetPasswordPage.tsx`

When the user clicks the reset link, Supabase puts the recovery token in the URL hash and `onAuthStateChange` fires with event `PASSWORD_RECOVERY` — the user is now in a temporary recovery session. From this state, calling `setPasswordForCurrentUser(newPassword)` works.

Layout per design doc section 4. Two password fields, validation via `validatePassword`, submit calls `setPasswordForCurrentUser`. Success → toast + `navigate(ROUTES.BOARDS)`.

If no recovery session is active (e.g., user landed here directly), show: "링크가 만료되었습니다. 다시 요청해주세요." with a button back to `/forgot-password`.

**Manual test:**
1. From `/login`, click "비밀번호를 잊으셨나요?".
2. Submit a known email.
3. Open Inbucket, click reset link.
4. Land on `/set-password` with active recovery session.
5. Submit new password → redirected, toast shown.
6. `/login` with new password → succeeds.

**Commit:**
```
/set-password 비밀번호 재설정 화면 구현

- 재설정 링크 클릭 시 임시 recovery 세션에서 새 비밀번호 저장
- 만료/직접 진입 케이스를 분리해 안내
```

---

## Phase 7 — Settings: 비밀번호 추가 / 변경

### Task 7.1: `useHasPasswordIdentity` hook

**Files:**
- Create: `apps/web/src/user/hooks/useHasPasswordIdentity.ts`

Reads `user.identities` from Supabase. An email/password identity has `provider: 'email'`.

```ts
import { useAuth } from '@/shared/hooks/useAuth';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/shared/api/supabaseClient';

export function useHasPasswordIdentity(): boolean | null {
  const { currentUser } = useAuth();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    if (!currentUser) { setHasPassword(null); return; }
    getSupabaseClient().auth.getUser().then(({ data }) => {
      const identities = data.user?.identities ?? [];
      setHasPassword(identities.some(i => i.provider === 'email'));
    });
  }, [currentUser]);

  return hasPassword;
}
```

**Commit:**
```
useHasPasswordIdentity hook 추가

- Settings 화면에서 비밀번호 추가/변경 행을 분기하기 위해 사용자 identity 조회
```

---

### Task 7.2: Add password row to `UserSettingPage`

**Files:**
- Modify: `apps/web/src/user/components/UserSettingPage.tsx`

Insert between the Dark Mode row (lines 64-78) and the Logout button (lines 79-86). Use `KeyRound` from `lucide-react`. Two states from `useHasPasswordIdentity`:
- `false` (no password yet) → "비밀번호 추가" + right-aligned `설정 안 됨` badge → navigate to `ROUTES.ADD_PASSWORD`
- `true` (already set) → "비밀번호 변경" + `설정됨` badge → navigate to `ROUTES.CHANGE_PASSWORD`
- `null` (loading) → render skeleton row

Match the existing button class string exactly: `"reading-hover reading-focus flex h-14 w-full items-center justify-start gap-3 rounded-none border-b border-border/30 px-4 text-base transition-all duration-200"`.

**Commit:**
```
설정 화면에 비밀번호 추가/변경 행 추가

- 다크모드와 로그아웃 사이(보안 항목 그룹) 위치
- 비밀번호 보유 여부에 따라 라벨과 라우트 자동 분기
```

---

### Task 7.3: `AddPasswordPage`

**Files:**
- Modify: `apps/web/src/user/components/AddPasswordPage.tsx`

Per design doc section 5. Two password fields + `PasswordRequirements`. Submit calls `setPasswordForCurrentUser`. Success → toast "비밀번호가 설정되었습니다. 이제 이메일로도 로그인할 수 있어요." → `navigate(-1)` back to Settings. The password row will refresh because `useHasPasswordIdentity` re-runs on mount.

Button: `variant="cta"` (per design — this is a value-adding conversion).

**Commit:**
```
/settings/add-password 화면 구현

- 로그인 상태에서 updateUser({ password })로 비밀번호를 직접 추가
- 이메일 매직링크 불필요 (이미 인증된 세션)
```

---

### Task 7.4: `ChangePasswordPage`

**Files:**
- Modify: `apps/web/src/user/components/ChangePasswordPage.tsx`

Same shape as `AddPasswordPage` but headline is "비밀번호 변경" and button is `variant="default"` (existing-setting update, not new conversion).

**Per Q1 decision:** No current-password field. Already-logged-in session is enough.

**Commit:**
```
/settings/change-password 화면 구현

- 현재 비밀번호 재확인 없이 새 비밀번호만 입력 (로그인 세션이 인증 역할)
- 디자인 문서의 "변경 = 갱신" 계층(default 버튼)에 맞춤
```

---

## Phase 8 — IntroCTA / JoinIntroPage cleanup

### Task 8.1: Update `IntroCTA` to navigate to `/login`

**Files:**
- Modify: `apps/web/src/login/components/IntroCTA.tsx`
- Modify: `apps/web/src/login/components/JoinIntroPage.tsx`

Replace `onLogin(returnTo)` calls with:
```ts
sessionStorage.setItem('returnTo', returnTo);
navigate(ROUTES.LOGIN);
```

Remove the now-unused `onLogin` prop from `IntroCTAProps`. Remove `useGoogleLoginWithRedirect` import and usage from `JoinIntroPage` since the marketing page no longer triggers Google directly.

**Manual test:** From `/join` (logged out), click "시작하기" → lands on `/login` with both options visible. After login, `RootRedirect` reads `sessionStorage('returnTo')` and routes to `/join/form`.

**Commit:**
```
JoinIntroPage 진입 동선 정리

- IntroCTA가 Google 로그인을 직접 트리거하지 않고 /login으로 이동
- 사용자가 /login에서 Google과 이메일 중 선택 가능
- 더 이상 사용하지 않는 onLogin prop과 useGoogleLoginWithRedirect 제거
```

---

## Phase 9 — End-to-end manual verification

> **Invoke `verify-runtime` skill if available.** Evidence-based completion check.

### Task 9.1: Run the four critical paths against local Supabase

**Pre-conditions:** Local Supabase running, migrations applied, dev server up. Have two test emails handy: one with no existing user, one with a Google identity (seed via the dashboard).

**Path A — Net-new email signup:**
1. `/login` → 회원가입 link → `/signup`
2. Fresh email + valid password → submit
3. Lands on `/verify-email`, email visible
4. Inbucket → click verification link
5. Auto-redirects to `/boards` (or returnTo)
6. Sign out → `/login` → email/password → succeeds

**Path B — Existing Google user adds password:**
1. Sign in with Google
2. Settings → "비밀번호 추가" row → `/settings/add-password`
3. Submit valid password → toast → back to Settings
4. Settings now shows "비밀번호 변경" with `설정됨` badge
5. Sign out → `/login` → email/password with same email → succeeds (auto-linked)

**Path C — Forgot password:**
1. `/login` → "비밀번호를 잊으셨나요?" → `/forgot-password`
2. Enter known email → success message
3. Inbucket → click reset link → lands on `/set-password`
4. New password → submit → redirect + toast
5. `/login` with new password → succeeds

**Path D — Account collision (Google identity already exists):**
1. Have a Google user `foo@gmail.com` in the system
2. From `/signup`, register `foo@gmail.com` with a password
3. Lands on `/verify-email`
4. Click verification link in Inbucket
5. Login with email/password → succeeds, lands on the *same* user record (verify by post history or user ID)

**Path E — Kakao banner:**
1. Spoof user agent to include `kakaotalk` (DevTools → User Agent override)
2. Open `/login` → banner visible above Google button
3. Email login still works

**If any path fails, file a follow-up note and fix before claiming done.**

**Commit (only if anything was patched during E2E):**
```
이메일 인증 E2E 검증 중 수정 사항

- <구체적 수정 내용>
```

---

## Out of scope (do not build in this plan)

- Account unlinking UI
- "Sign in with Apple" or any third OAuth provider
- Password strength meter beyond the 3-rule check
- Rate limiting beyond Supabase defaults
- E2E automated tests via Playwright (manual verification is enough for this MVP — automation is a follow-up if value is proven)
- The "비밀번호로 처음 로그인하시나요?" link on `/login` (explicitly deferred per design doc)

---

## Open questions to resolve before merge

None blocking — all design decisions are committed in `docs/plans/2026-05-04-email-password-auth-design.md`. If something feels ambiguous during implementation, default to the design doc; if still unclear, surface it before improvising.
