# Add Login Method UX 개편 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
>
> **Required project skills:** `daily-writing-friends-design` (UI), `react-component`, `code-style`, `commit`. Invoke each at the relevant phase.
>
> **Context:** This is a follow-up to PR #566 (`feat/email-password-auth`). Continue work on the same branch — no new branch / worktree needed. The PR is open and under review; these commits push to the existing branch.

**Goal:** Google-only 사용자가 Settings에서 보는 모호한 "비밀번호 추가" 동선을 "한 계정 = 여러 로그인 방법 연결" 멘탈 모델로 재설계. 사용자 인용: "Why would I add password after I already logged in?" — 이 질문이 안 나오게 만든다.

**Architecture:** 라우트 1개 rename(`/settings/add-password` → `/settings/add-login-method`), 페이지 1개 rewrite(현재 Google 로그인 카드 + 이메일/비밀번호 추가 카드의 2-card 레이아웃), Settings 행 1개 라벨 교체. ChangePasswordPage / `/settings/change-password` 는 건드리지 않음 — 비밀번호를 이미 가진 사용자에겐 "비밀번호 변경" 멘탈 모델이 정확함.

**Tech Stack:** React 18, react-router-dom v6, react-hook-form + zod (기존 패턴 유지), Tailwind + shadcn `@/shared/ui/*`, lucide-react (`KeyRound`, `Mail`, `CheckCircle2`), `useAuth` (`currentUser.email`/`displayName`/`photoURL`).

---

## Pre-flight

- 현재 브랜치 확인: `git branch --show-current` → `feat/email-password-auth` 이어야 함.
- 작업 트리 깨끗한지: `git status --short` → 빈 상태이어야 함 (이전 commit 까지 push 완료).
- 빠른 sanity: `pnpm --filter web exec tsc --noEmit` → exit 0.

---

## Phase 1 — Settings 행 + 라우트 상수

### Task 1.1: ROUTES 상수 rename

**Files:**
- Modify: `apps/web/src/login/constants.ts`

**Step 1: Edit**

```ts
// before
/** 설정 - 비밀번호 추가 페이지 */
ADD_PASSWORD: '/settings/add-password',

// after
/** 설정 - 로그인 수단 추가 페이지 (이메일/비밀번호 추가) */
ADD_LOGIN_METHOD: '/settings/add-login-method',
```

**Step 2: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: 2 errors — `ROUTES.ADD_PASSWORD` 가 사용 중인 곳(UserSettingPage, router.tsx). 다음 task 들에서 fix 됨.

**No commit yet** — Task 1.1 + 1.2 + Phase 2 의 router import 까지 한 commit 으로 묶음 (rename 은 atomic 해야 함).

---

### Task 1.2: UserSettingPage state-A 행 라벨 교체

**Files:**
- Modify: `apps/web/src/user/components/UserSettingPage.tsx`

**Step 1: 현재 state-A 행** (`hasPassword === false` 분기) — `KeyRound` 아이콘, "비밀번호 추가" 라벨, "설정 안 됨" 우측 보조 텍스트, `navigate(ROUTES.ADD_PASSWORD)`.

**Step 2: 새 행으로 교체** — 같은 자리에:

```tsx
<Button
  variant="ghost"
  className="reading-hover reading-focus flex h-14 w-full items-center justify-start gap-3 rounded-none border-b border-border/30 px-4 text-base transition-[background-color] duration-200"
  onClick={() => navigate(ROUTES.ADD_LOGIN_METHOD)}
>
  <KeyRound className="size-5 text-muted-foreground" />
  <span className="text-foreground">로그인 수단 추가</span>
  <span className="ml-auto text-xs text-muted-foreground">이메일/비밀번호 로그인</span>
</Button>
```

State B (`hasPassword === true` 분기) 와 skeleton (`hasPassword === null`) 행은 **건드리지 않음**.

**Step 3: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: 1 error 남음 — `router.tsx` 의 `ROUTES.ADD_PASSWORD`. Phase 2 에서 fix.

---

## Phase 2 — Page rename + 새 레이아웃

### Task 2.1: Component 파일 rename (git mv)

**Files:**
- Rename: `apps/web/src/user/components/AddPasswordPage.tsx` → `AddLoginMethodPage.tsx`
- Modify: `apps/web/src/router.tsx`

**Step 1: git mv**

```bash
git mv apps/web/src/user/components/AddPasswordPage.tsx \
       apps/web/src/user/components/AddLoginMethodPage.tsx
```

**Step 2: router.tsx 수정**

- import line: `AddPasswordPage` → `AddLoginMethodPage`, 경로 `@/user/components/AddLoginMethodPage`
- route entry: `path: 'settings/add-password'` → `path: 'settings/add-login-method'`, element 도 `<AddLoginMethodPage />`

**Step 3: 일단 컴포넌트 default export 이름 정합성 맞춤** (rewrite 전 임시):

```tsx
// rename 직후, 함수명만 바꿔서 import 깨짐 방지
export default function AddLoginMethodPage() { /* 기존 body 그대로 */ }
```

**Step 4: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: exit 0 (모든 reference 정합).

**Step 5: Commit (Phase 1 + Task 2.1 묶음)**

```bash
git add apps/web/src/login/constants.ts \
        apps/web/src/user/components/UserSettingPage.tsx \
        apps/web/src/user/components/AddLoginMethodPage.tsx \
        apps/web/src/router.tsx
git commit -m "$(cat <<'EOF'
ROUTES.ADD_PASSWORD → ADD_LOGIN_METHOD 으로 rename

- '비밀번호 추가' 라벨이 OAuth 사용자에게 모호하다는 피드백
  (Why would I add password after I already logged in?)
- 라우트 경로(/settings/add-login-method)와 컴포넌트 파일명도 같이 정리
- 행 라벨은 '로그인 수단 추가' + 부가 설명 '이메일/비밀번호 로그인'
- ChangePasswordPage 는 건드리지 않음 (변경 시 멘탈 모델은 이미 정확)
- 페이지 본문 rewrite 는 다음 commit 에서 분리
EOF
)"
```

---

### Task 2.2: AddLoginMethodPage 레이아웃 rewrite

> **Invoke `daily-writing-friends-design` skill before this task.** 토큰/버튼 계층/UI Polish Baseline 준수 필요 (`transition-all` 금지, 36px 최소 타깃, `text-pretty`).

**Files:**
- Modify: `apps/web/src/user/components/AddLoginMethodPage.tsx`

**Step 1: 전체 파일 교체**

(아래 전체 코드. 실행자는 그대로 적용 가능.)

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import FormField from '@/login/components/JoinFormField';
import { PasswordRequirements } from '@/login/components/PasswordRequirements';
import { validatePassword } from '@/login/utils/passwordValidation';
import { setPasswordForCurrentUser } from '@/shared/auth/supabaseAuth';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

const addLoginMethodSchema = z
  .object({
    password: z
      .string()
      .min(1, '비밀번호를 입력해주세요.')
      .refine((val) => validatePassword(val) === null, {
        message: '비밀번호 요구사항을 확인해주세요.',
      }),
    passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });

type AddLoginMethodFormValues = z.infer<typeof addLoginMethodSchema>;

function CurrentMethodCard({
  email,
  name,
  photoURL,
}: {
  email: string;
  name: string | null;
  photoURL: string | null;
}) {
  return (
    <div className='rounded-lg border border-border/50 bg-muted/40 p-3'>
      <p className='mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
        지금 사용 중
      </p>
      <div className='flex items-center gap-3'>
        {photoURL ? (
          <img
            src={photoURL}
            alt=''
            className='size-10 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10'
          />
        ) : (
          <div className='flex size-10 items-center justify-center rounded-full bg-background ring-1 ring-inset ring-black/10 dark:ring-white/10'>
            <span className='text-sm font-medium text-foreground'>
              {(name ?? email).slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium text-foreground'>Google</p>
          <p className='truncate text-xs text-muted-foreground'>{email}</p>
        </div>
        <span className='flex shrink-0 items-center gap-1 text-xs text-green-600 dark:text-green-400'>
          <CheckCircle2 className='size-3.5' />
          연결됨
        </span>
      </div>
    </div>
  );
}

export default function AddLoginMethodPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AddLoginMethodFormValues>({
    resolver: zodResolver(addLoginMethodSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  const passwordValue = watch('password') ?? '';

  const onSubmit = async ({ password }: AddLoginMethodFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await setPasswordForCurrentUser(password);
      toast.success('이메일/비밀번호 로그인이 추가되었습니다.', {
        position: 'bottom-center',
      });
      navigate(-1);
    } catch {
      setSubmitError('저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const email = currentUser?.email ?? '';

  return (
    <div className='flex min-h-screen items-start justify-center bg-background px-3 py-6 md:px-4'>
      <Card className='reading-shadow w-full max-w-md border-border/50'>
        <CardHeader>
          <CardTitle className='text-2xl font-semibold tracking-tight text-foreground'>
            로그인 수단 추가
          </CardTitle>
          <p className='text-sm text-muted-foreground text-pretty'>
            같은 계정에 다른 로그인 방법을 연결할 수 있어요. 어디서 들어오든 같은 계정으로 접속됩니다.
          </p>
        </CardHeader>

        <CardContent className='space-y-5'>
          <CurrentMethodCard
            email={email}
            name={currentUser?.displayName ?? null}
            photoURL={currentUser?.photoURL ?? null}
          />

          <div className='space-y-3'>
            <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
              추가할 수 있는 방법
            </p>
            <div className='rounded-lg border border-border/50 bg-card p-4'>
              <div className='mb-3 flex items-center gap-2'>
                <Mail className='size-5 text-muted-foreground' />
                <span className='text-sm font-medium text-foreground'>
                  이메일/비밀번호
                </span>
              </div>

              {email && (
                <p className='mb-4 text-xs text-muted-foreground'>
                  <span className='font-medium text-foreground'>{email}</span>로
                  로그인할 수 있어요.
                </p>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                <div className='space-y-2'>
                  <FormField
                    id='password'
                    label='새 비밀번호'
                    type='password'
                    inputMode='text'
                    placeholder='새 비밀번호'
                    register={register}
                    error={errors.password}
                  />
                  <PasswordRequirements password={passwordValue} />
                </div>

                <FormField
                  id='passwordConfirm'
                  label='비밀번호 확인'
                  type='password'
                  inputMode='text'
                  placeholder='비밀번호를 한 번 더 입력해주세요'
                  register={register}
                  error={errors.passwordConfirm}
                />

                {submitError && (
                  <p className='text-sm text-destructive'>{submitError}</p>
                )}

                <Button
                  variant='cta'
                  type='submit'
                  disabled={isSubmitting}
                  className='min-h-[44px] w-full'
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className='mr-2 size-4 animate-spin' />
                      추가 중...
                    </>
                  ) : (
                    '추가하기'
                  )}
                </Button>
              </form>
            </div>
          </div>

          <Button
            variant='ghost'
            type='button'
            onClick={() => navigate(-1)}
            className='w-full text-muted-foreground'
          >
            취소
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Verify**

Run: `pnpm --filter web exec tsc --noEmit && pnpm --filter web exec vitest --run`
Expected: tsc exit 0, 모든 기존 632 tests + 18 신규 tests (passwordValidation 8 + useEmailLogin 6 + useHasPasswordIdentity 7 + supabaseAuth 11) 통과.

**Step 3: 수동 확인 (브라우저)**

1. `pnpm --filter web dev` 로 dev server 부팅 (live Supabase 사용 중인 사용자 시점).
2. Google 만 로그인된 계정으로 `/user/settings` 진입 → 행 라벨 "로그인 수단 추가", 우측 "이메일/비밀번호 로그인" 확인.
3. 그 행 클릭 → `/settings/add-login-method` 이동, 상단 카드에 본인 Google 아바타 + email + "✓ 연결됨" 보임.
4. 비밀번호 8자/영문/숫자 충족하게 입력, 확인 일치 → "추가하기" 클릭 → toast "이메일/비밀번호 로그인이 추가되었습니다." → Settings 로 복귀 → 행이 "비밀번호 변경 / 설정됨" 으로 바뀐 것 확인.
5. 로그아웃 → `/login` 에서 같은 email + 새 password 로 로그인 성공.

**Step 4: Commit**

```bash
git add apps/web/src/user/components/AddLoginMethodPage.tsx
git commit -m "$(cat <<'EOF'
AddLoginMethodPage: '한 계정, 여러 로그인 방법' 멘탈 모델로 재설계

- 상단에 현재 사용 중인 Google 로그인 카드 노출 (avatar + email + '연결됨' 배지)
- 추가 가능한 방법으로 '이메일/비밀번호' 카드 (Mail 아이콘 + 안내문 + 폼)
- '비밀번호 추가' 라는 모호한 표현 대신 '추가하기' / 'XXX로 로그인할 수 있어요' 로
  '왜 비밀번호를 추가하지?' 같은 질문이 나오지 않게 함
- 폼 자체와 setPasswordForCurrentUser 호출은 그대로
EOF
)"
```

---

## Phase 3 — Doc 갱신

### Task 3.1: design / impl 문서 갱신

**Files:**
- Modify: `docs/plans/2026-05-04-email-password-auth-design.md` (5절 — Settings 비밀번호 추가/변경 섹션)
- Modify: `docs/plans/2026-05-04-email-password-auth-impl.md` (Phase 7.2 / 7.3 — 라우트 / 표제)

**Step 1: design.md 5절**

- "비밀번호 추가" 헤더 / 카피 → "로그인 수단 추가" 로 통일.
- 상태 A (비밀번호 없음) 의 행 예시 코드의 라벨 / 보조 텍스트 / 라우트 (`/settings/add-password` → `/settings/add-login-method`) 를 모두 새 카피로 교체.
- 페이지 wireframe (ASCII) 도 새 2-card 레이아웃 (현재 사용 중 + 추가할 방법) 으로 다시 그림.
- 결정 추적 (Decision Log) 표 마지막에 한 줄 추가:
  > "비밀번호 추가" 카피는 OAuth 사용자에게 모호 → "로그인 수단 추가" 로 변경. 한 계정 여러 로그인 방법 멘탈 모델을 명시.

**Step 2: impl.md Phase 7**

- Task 7.2 의 행 navigate target: `ROUTES.ADD_PASSWORD` → `ROUTES.ADD_LOGIN_METHOD`. 라벨 / 보조 텍스트도 새 카피로.
- Task 7.3 의 표제 "AddPasswordPage" → "AddLoginMethodPage", 경로 `/settings/add-password` → `/settings/add-login-method`. 본문 설명도 멘탈 모델 변화에 맞춰 한 두 줄 추가.
- ROUTES 상수 키 `ADD_PASSWORD` → `ADD_LOGIN_METHOD` 도 Phase 1 task 1.2 예시에서 갱신.

**Step 3: Verify**

`grep -n add-password docs/plans/2026-05-04-email-password-auth-*.md` → 결과 없음 이어야 함 (모두 갱신됐는지).
`grep -n ADD_PASSWORD docs/plans/2026-05-04-email-password-auth-*.md` → 결과 없음.

**Step 4: Commit**

```bash
git add docs/plans/2026-05-04-email-password-auth-design.md \
        docs/plans/2026-05-04-email-password-auth-impl.md
git commit -m "docs: 로그인 수단 추가 UX 개편을 design/impl 문서에 반영"
```

---

## Phase 4 — Push

### Task 4.1: Push to PR #566

**Step 1:** `git push`

**Step 2:** PR 페이지에서 Copilot review 가 새로 돌면 결과 확인. 아니면 그대로 사용자가 수동 검토.

---

## Out of scope (do not build)

- "로그인 수단 제거 / disconnect" UI — 후속 PR.
- 다중 OAuth provider (Apple / Kakao 등) 동적 enumeration — 현재 Google 하나뿐, hardcode 가 더 명확.
- ChangePasswordPage UX 개편 — 비밀번호 변경 멘탈 모델은 이미 정확.
- ROUTES key 의 `_PASSWORD` 잔재(`SET_PASSWORD`, `FORGOT_PASSWORD`, `CHANGE_PASSWORD`) — 이건 진짜로 비밀번호에 관한 것.
- 새 unit test 추가 — 새로운 로직이 없음 (UI 재배치만).

---

## Open decisions (이미 확정 — 실행자가 다시 묻지 말 것)

| 항목 | 확정 값 |
|---|---|
| 라우트 rename | `/settings/add-password` → `/settings/add-login-method` |
| 페이지 상단 카드 | Google 아바타 + email 표시 |
| Settings 행 메인 라벨 | "로그인 수단 추가" |
| Settings 행 보조 텍스트 | "이메일/비밀번호 로그인" |
| Page header | "로그인 수단 추가" |
| Page subtitle | "같은 계정에 다른 로그인 방법을 연결할 수 있어요. 어디서 들어오든 같은 계정으로 접속됩니다." |
| CTA 버튼 라벨 | "추가하기" |
| 성공 toast | "이메일/비밀번호 로그인이 추가되었습니다." |
| 현재 사용 중 카드 — provider 이름 | "Google" (hardcode — 현재 한 가지뿐) |
| 변경되지 않는 것 | ChangePasswordPage / `/settings/change-password` / state-B 행 / SET_PASSWORD 라우트 |
