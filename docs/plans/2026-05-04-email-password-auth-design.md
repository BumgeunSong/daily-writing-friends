# 이메일/비밀번호 인증 추가 — UI 디자인 제안

**작성일:** 2026-05-04  
**범위:** 이메일/비밀번호 로그인을 Google OAuth와 나란히 추가하는 모든 UI 화면  
**고정 결정사항:** 이 문서는 기획 브레인스토밍에서 확정된 결정들을 구현하는 디자인 제안임. 결정 자체는 재논의하지 않음.

---

## 결정 요약 (Decisions Summary)

| 항목 | 결정 |
|------|------|
| 로그인 화면 구조 | 구글 버튼 + 이메일 폼이 하나의 화면에 공존. 탭/토글 없음 |
| 계층 순서 | 구글 버튼 위, 이메일 폼 아래 (기존 사용자 편의 > 신규 유입 최적화) |
| 구분선 스타일 | `text-muted-foreground` 텍스트 "또는" + 양쪽 `border-border/50` 선 |
| 회원가입 링크 위치 | 이메일 폼 하단, `text-ring hover:underline` 링크 스타일 |
| 비밀번호 찾기 링크 | `/login` 푸터에 노출 |
| 비밀번호 처음 설정 (기존 Google 사용자) | **Settings 화면에서만 가능**. `/login`에 별도 링크 없음 (MVP 단순화) |
| 이메일 인증 | Supabase 네이티브 플로우. 인증 전까지 로그인 불가 |
| 계정 자동 연결 | Supabase 자동 연결(automatic linking) 기본 동작에 의존. 별도 설정 불필요 |
| Settings 비밀번호 섹션 위치 | 다크모드 행과 로그아웃 행 사이에 삽입 |
| Settings에서 비밀번호 추가 | `updateUser({ password })` 직접 호출. 이메일 매직링크 불필요 (이미 로그인 상태이므로) |
| 비밀번호 변경 시 현재 비밀번호 확인 | **요구하지 않음** — 로그인 세션이 충분한 인증으로 간주 |
| `/settings/add-login-method` UI | 별도 페이지 (모달 X) |
| `/set-password` 라우트 용도 | **비밀번호 재설정 전용** (forgot password). 초기 설정에는 사용하지 않음 |
| IntroCTA 변경 | 양쪽 버튼 모두 `/login`으로 이동. 마케팅 페이지에 별도 안내 불필요 |
| Kakao 인앱 브라우저 | 이메일 로그인을 권장 경로로 안내하는 인라인 배너 추가 |

---

## 1. `/login` — 통합 로그인 화면

### 레이아웃 구조

현재 `LoginPage.tsx`의 Card 패턴(`reading-shadow w-full max-w-md border-border/50`)을 유지하고 내용을 확장.

```
┌─────────────────────────────┐
│  CardHeader                 │
│  "매일 글쓰기 프렌즈"         │  text-2xl font-semibold tracking-tight
│  [연필 아이콘 16px]           │  현재 위치 유지
│                             │
│  CardContent                │
│  [구글로 로그인하기]           │  variant="default", w-full, min-h-[44px]
│                             │
│  ── 또는 ──                  │  divider (아래 상세)
│                             │
│  이메일                      │  JoinFormField 패턴, h-12 lg:h-14
│  비밀번호                     │  JoinFormField 패턴, h-12 lg:h-14
│                             │
│  [이메일로 로그인]             │  variant="default", w-full
│                             │
│  CardFooter                 │
│  링크 영역 (아래 상세)         │
└─────────────────────────────┘
```

### 계층 결정 근거

구글 버튼이 위에 오는 이유: 주요 타겟(기존 Google 사용자)이 집에서 접속할 때는 여전히 구글을 쓴다. 직장에서 오는 사용자는 이메일 폼을 찾아 스크롤할 동기가 있다. 두 옵션을 탭으로 숨기면 두 번째 옵션의 존재를 모르게 되는 문제가 생기므로 한 화면에 모두 노출.

### 구분선 (Divider)

```tsx
<div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t border-border/50" />
  </div>
  <div className="relative flex justify-center text-xs">
    <span className="bg-card px-3 text-muted-foreground">또는</span>
  </div>
</div>
```

`border-border/50`으로 Bear 스타일 미니멀 구분. "또는" 텍스트는 `text-muted-foreground`로 낮은 채도.

### 링크 영역 (CardFooter)

```tsx
<CardFooter className="flex-col gap-3 pt-0">
  {/* 에러 메시지 */}
  {error && <p className="text-sm text-destructive">{error.message}</p>}

  {/* 하단 링크 1줄 */}
  <div className="flex w-full justify-between text-sm">
    <Link to="/forgot-password" className="text-ring hover:underline">비밀번호를 잊으셨나요?</Link>
    <Link to="/signup" className="text-ring hover:underline">회원가입</Link>
  </div>
</CardFooter>
```

**"비밀번호를 잊으셨나요?"** — 비밀번호 재설정 플로우. `/forgot-password`로 이동해 이메일 입력 → 재설정 링크 발송 → `/set-password?mode=reset`.

**"회원가입"** — Google 없는 신규 사용자를 위한 `/signup` 링크. 오른쪽 배치로 보조 동선임을 명확히.

> **MVP 결정:** "비밀번호로 처음 로그인하시나요?" 링크는 추가하지 않는다. 기존 Google 사용자가 비밀번호를 처음 설정하려면 집에서 Google로 로그인 → Settings에서 비밀번호 추가의 경로만 지원. 직장에서 막힌 상태로 처음 설정을 시도하는 경우는 지원하지 않음 (수용 가능한 트레이드오프).

### 로딩 상태

```tsx
// 이메일 로그인 버튼
{isEmailLoading ? (
  <><Loader2 className="mr-2 size-4 animate-spin" />로그인 중...</>
) : '이메일로 로그인'}
```

기존 `useGoogleLoginWithRedirect` 훅 패턴과 동일하게 `isLoading` + `Loader2 animate-spin`.

### 에러 상태 (인라인)

- 잘못된 비밀번호: `"이메일 또는 비밀번호가 올바르지 않습니다."`  `text-sm text-destructive` (포괄적 메시지로 어느 쪽이 틀렸는지 노출 안 함 — 보안)
- 미인증 이메일: `"이메일 인증이 필요합니다."` + `"인증 메일 다시 받기"` 버튼 (`variant="outline" size="sm"`)
- 가입되지 않은 이메일: `"가입된 계정이 없습니다. 회원가입 후 이용해주세요."`

### Kakao 인앱 브라우저 특별 처리

구글 버튼 위에 인라인 배너를 표시:

```tsx
{isKakaoBrowser && (
  <div className="mb-4 rounded-md border border-border/50 bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
    카카오톡에서 열었을 때는 <span className="text-foreground font-medium">이메일 로그인</span>을 이용해주세요.
  </div>
)}
```

`bg-muted/50`으로 배경을 살짝 띄우되 시각적 소음은 최소화. 구글 버튼은 그대로 두되 (기능은 작동 안 하더라도 제거하면 혼란), 이메일 폼에 시선을 자연스럽게 유도.

### 대안 검토

**대안 A — 탭 전환 (구글 | 이메일):** 인지 부하가 낮지만 두 번째 탭 존재를 모르는 사용자가 생긴다. 기존 Google 사용자가 직장에서 막혀 처음 이메일 탭을 찾는 상황에서 탭 선택이 추가 마찰. **기각.**

**대안 B — 이메일 폼을 접힌 상태로 시작:** 초기에는 구글 버튼만 보이고, 클릭하면 이메일 폼 확장. 신규 사용자에게 깔끔하지만 이미 이메일 로그인을 쓰는 사용자는 불편. **기각.** 현재 제안(항상 펼침)이 낫다.

**권장:** 현재 제안 (두 옵션 항상 노출, 구글 위에 배치).

---

## 2. `/signup` — 신규 이메일 회원가입

### 레이아웃 구조

```
┌─────────────────────────────┐
│  CardHeader                 │
│  "회원가입"                   │  text-2xl font-semibold
│  "이메일로 계정을 만들어요"     │  text-sm text-muted-foreground
│                             │
│  CardContent                │
│  이메일                      │  JoinFormField (type="email")
│  비밀번호                     │  JoinFormField (type="password")
│    └ 요구사항 힌트             │  (아래 상세)
│  비밀번호 확인                 │  JoinFormField (type="password")
│                             │
│  [회원가입]                   │  variant="cta", w-full
│                             │
│  CardFooter                 │
│  "이미 계정이 있으신가요?" [로그인] │  text-muted-foreground + text-ring 링크
└─────────────────────────────┘
```

### 비밀번호 요구사항 표시

비밀번호 필드 아래, 에러 메시지 자리에 인라인 힌트:

```tsx
{/* 입력 전: 회색 힌트 */}
{!passwordValue && (
  <p className="text-xs text-muted-foreground">
    8자 이상, 영문과 숫자를 포함해주세요.
  </p>
)}

{/* 실시간 요구사항 체크 — 입력 중에만 표시 */}
{passwordValue && (
  <ul className="space-y-1 text-xs">
    <li className={isLongEnough ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
      {isLongEnough ? '✓' : '○'} 8자 이상
    </li>
    <li className={hasLetter ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
      {hasLetter ? '✓' : '○'} 영문 포함
    </li>
    <li className={hasNumber ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
      {hasNumber ? '✓' : '○'} 숫자 포함
    </li>
  </ul>
)}
```

요구사항: 최소 8자, 영문 + 숫자 포함. 실시간 체크는 포커스 진입 후 또는 첫 타이핑 시작 후에만 표시 (빈 상태에서 에러처럼 보이지 않도록).

비밀번호 확인 필드 에러: `"비밀번호가 일치하지 않습니다."` — `text-sm text-destructive`.

### 폼 제출 후 동작

제출 성공 → `/verify-email`로 라우팅. 이메일 주소를 URL state 또는 sessionStorage로 전달 (재발송 버튼에 사용).

### 계정 충돌 케이스 (이미 Google로 가입된 이메일)

제출 직후 에러를 바로 표시하지 않는다. 대신 자동 연결 플로우로 진행:

```
제출 → Supabase에 이메일/비밀번호로 가입 시도
     → 이미 Google 계정 있음 감지
     → 인증 메일 발송 (연결 플로우용)
     → /verify-email로 이동
     → 이메일 내 안내: "인증하면 기존 구글 계정에 이메일 로그인이 추가됩니다"
```

`/verify-email`에서의 복사문은 아래 섹션에서 다룸.

### 버튼

```tsx
<Button variant="cta" type="submit" className="w-full min-h-[44px]" disabled={isLoading}>
  {isLoading ? (
    <><Loader2 className="mr-2 size-4 animate-spin" />가입 중...</>
  ) : '회원가입'}
</Button>
```

`variant="cta"` — 회원가입은 전환 행동이므로 가장 높은 계층.

---

## 3. `/verify-email` — 이메일 인증 대기 화면

### 레이아웃 구조

```
┌─────────────────────────────┐
│  CardHeader                 │
│  "인증 메일을 보냈어요"          │  text-2xl font-semibold
│                             │
│  CardContent                │
│  [메일 아이콘 — lucide Mail]   │  size-12 text-muted-foreground mb-2
│                             │
│  "{email}로 인증 링크를        │  text-sm text-foreground
│   보냈습니다. 메일함을 확인하고   │
│   링크를 클릭하면 로그인할 수     │
│   있어요."                    │
│                             │
│  "스팸 메일함도 확인해보세요."    │  text-xs text-muted-foreground
│                             │
│  [인증 메일 다시 받기]          │  variant="outline", w-full
│                             │
│  CardFooter                 │
│  [로그인 화면으로]              │  variant="ghost", text-muted-foreground
└─────────────────────────────┘
```

### 재발송 버튼 동작

클릭 시: 버튼 비활성화 30초 (스팸 방지) + 카운트다운 표시.

```tsx
{cooldown > 0
  ? `다시 받기 (${cooldown}초 후)`
  : '인증 메일 다시 받기'}
```

재발송 성공 시 `toast.success('인증 메일을 다시 보냈습니다.', { position: 'bottom-center' })` — 기존 toast 패턴 사용.

### 폴링 vs 순수 대기

순수 수동 대기를 권장. 폴링(`onAuthStateChange`)은 Supabase 세션 이벤트를 수신하므로 사용자가 같은 브라우저에서 링크를 클릭하면 자동으로 앱이 반응하고 리다이렉트된다. 별도 폴링 루프 불필요.

사용자가 다른 기기에서 링크를 클릭한 경우: 이 화면에서는 아무 반응 없음. "로그인 화면으로" 버튼으로 이동해 로그인 시도.

### Google 계정 연결 플로우 시의 특별 복사문

sessionStorage에 `authMode: 'link'` 저장 후 이 화면에서 읽어 조건부 메시지:

```tsx
{authMode === 'link' ? (
  <p className="text-sm text-muted-foreground mt-3 text-center">
    인증하면 기존 구글 계정에 이메일 로그인이 추가됩니다.
    앞으로 두 방법 모두 사용할 수 있어요.
  </p>
) : null}
```

### 톤

따뜻하고 안심시키는 어조. "잠깐 기다려주세요"가 아니라 "메일을 보냈어요"로 완료 느낌. 대기 상태이지만 막힌 느낌이 아니라 "다음 단계로 가는 중"의 느낌.

---

## 4. `/set-password` — 비밀번호 재설정 (forgot password 전용)

### 용도

URL 토큰으로 진입하는 비밀번호 재설정 화면. **비밀번호 재설정 단일 시나리오**만 처리. (초기 설정은 Settings의 `updateUser({ password })`로 처리하므로 이 라우트와 무관.)

### 헤드라인

```tsx
<CardHeader>
  <CardTitle>비밀번호 재설정</CardTitle>
  <p className="text-sm text-muted-foreground">새로운 비밀번호를 설정해주세요.</p>
</CardHeader>
```

진입 경로: `/login` → "비밀번호를 잊으셨나요?" → `/forgot-password` (이메일 입력) → 재설정 메일 발송 → 사용자가 메일 링크 클릭 → `/set-password?token=...`.

### 레이아웃 구조

```
┌─────────────────────────────┐
│  CardHeader                 │
│  "비밀번호 설정" / "비밀번호 재설정" │  조건부
│  subtitle                   │  text-sm text-muted-foreground
│                             │
│  CardContent                │
│  새 비밀번호                  │  JoinFormField (type="password")
│    └ 요구사항 힌트 (signup과 동일) │
│  비밀번호 확인                 │  JoinFormField (type="password")
│                             │
│  [비밀번호 저장]               │  variant="default", w-full
└─────────────────────────────┘
```

비밀번호 저장은 로그인 완료 행동이므로 `variant="default"` (Primary). `variant="cta"`가 아닌 이유: 이미 계정이 있고 완료 단계이므로 전환 행동이 아니라 확인 행동.

### 제출 후 동작

성공 시: `toast.success('비밀번호가 설정되었습니다.')` → 자동으로 로그인 상태가 됨 (Supabase 세션) → `navigate('/boards')` 또는 sessionStorage의 `returnTo`.

### 토큰 만료/무효 에러

```tsx
<div className="rounded-md border border-border/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
  링크가 만료되었습니다. 다시 요청해주세요.
</div>
```

만료된 경우 폼 대신 에러 상태 + "새 링크 요청" 버튼(`variant="outline"`).

---

## 5. Settings — 로그인 수단 추가 / 비밀번호 변경 섹션

### 위치

`UserSettingPage.tsx`의 현재 행 순서:
1. 다크 모드 토글
2. 로그아웃
3. 피드백
4. 캐시 삭제
5. 다음 기수 신청하기

**비밀번호 섹션을 1번과 2번 사이에 삽입.** 이유: 계정 보안 관련 항목끼리 모음(비밀번호 → 로그아웃). 하단의 앱 관련 항목(피드백, 캐시, 신청)과 자연스럽게 분리.

### 두 가지 상태

**상태 A: 비밀번호 없음 (Google 계정만 있는 사용자)**

```tsx
<Button
  variant="ghost"
  className="reading-hover reading-focus flex h-14 w-full items-center justify-start gap-3 rounded-none border-b border-border/30 px-4 text-base transition-[background-color] duration-200"
  onClick={() => navigate('/settings/add-login-method')}
>
  <KeyRound className="size-5 text-muted-foreground" />
  <span className="text-foreground">로그인 수단 추가</span>
  <span className="ml-auto text-xs text-muted-foreground">이메일/비밀번호 로그인</span>
</Button>
```

오른쪽 보조 텍스트 `"이메일/비밀번호 로그인"` — 무엇을 추가하는지 즉시 명시. "비밀번호 추가" 라는 모호한 표현(이미 로그인된 사용자에게 "왜 비밀번호를 또?"라는 질문 유발) 대신 "한 계정 = 여러 로그인 방법" 멘탈 모델로 안내.

**상태 B: 비밀번호 있음 (이미 설정한 사용자)**

```tsx
<Button
  variant="ghost"
  className="reading-hover reading-focus flex h-14 w-full items-center justify-start gap-3 rounded-none border-b border-border/30 px-4 text-base transition-[background-color] duration-200"
  onClick={() => navigate('/settings/change-password')}
>
  <KeyRound className="size-5 text-muted-foreground" />
  <span className="text-foreground">비밀번호 변경</span>
  <span className="ml-auto text-xs text-muted-foreground">설정됨</span>
</Button>
```

`"설정됨"` 레이블으로 현재 상태 확인. `KeyRound` (lucide-react)를 사용해 자물쇠/보안 맥락 전달. 비밀번호를 이미 가진 사용자에게는 "변경" 멘탈 모델이 정확하므로 라벨/페이지를 그대로 유지.

### 로그인 수단 추가 플로우 (Settings에서)

Settings 행 클릭 → `/settings/add-login-method` 페이지 (별도 라우트, 모달 아님). "한 계정 = 여러 로그인 방법" 멘탈 모델을 직접 보여주는 2-카드 레이아웃:

```
┌─────────────────────────────────────┐
│ 헤더                                 │
│ "로그인 수단 추가"                     │  text-2xl font-semibold
│ "같은 계정에 다른 로그인 방법을        │  text-sm text-muted-foreground text-pretty
│  연결할 수 있어요. 어디서 들어오든    │
│  같은 계정으로 접속됩니다."           │
│                                     │
│ ┌─ 지금 사용 중 ────────────────┐    │  uppercase tracking-wider 라벨
│ │ [avatar] Google              │    │  rounded-lg border bg-muted/40
│ │          email@example.com   │    │
│ │                       ✓ 연결됨│    │  green-600 / dark:green-400
│ └──────────────────────────────┘    │
│                                     │
│ ┌─ 추가할 수 있는 방법 ──────────┐    │  uppercase tracking-wider 라벨
│ │ [Mail] 이메일/비밀번호         │    │  rounded-lg border bg-card
│ │ email@example.com 로 로그인할 │    │  안내문 (현재 email 표시)
│ │ 수 있어요.                    │    │
│ │                              │    │
│ │ 새 비밀번호    JoinFormField  │    │  + PasswordRequirements
│ │ 비밀번호 확인  JoinFormField  │    │
│ │                              │    │
│ │ [추가하기]                    │    │  variant="cta", w-full, min-h-[44px]
│ └──────────────────────────────┘    │
│                                     │
│ [취소]                               │  variant="ghost"
└─────────────────────────────────────┘
```

**구현:** 사용자는 이미 Google로 로그인 상태이므로 `supabase.auth.updateUser({ password: newPassword })` 단일 API 호출로 끝남. 이메일 매직링크 불필요. Supabase는 비밀번호를 동일 user 레코드에 추가 (별도 identity 생성 X).

성공 시: `toast.success('이메일/비밀번호 로그인이 추가되었습니다.')` → Settings로 돌아감. Settings의 행은 이제 상태 B(`"비밀번호 변경" / "설정됨"`)로 갱신.

`variant="cta"` 사용: 사용자에게 가치 있는 새 능력을 활성화하는 전환 행동. 카피는 "비밀번호 설정" 대신 "추가하기"로, 안내문 ("XXX로 로그인할 수 있어요") 으로 결과를 명시해 "왜 비밀번호를 추가하지?" 질문이 나오지 않게 함.

별도 페이지 사용 이유: 모바일에서 소프트 키보드 + 다이얼로그 조합이 UX 문제를 자주 일으킴.

### 비밀번호 변경 플로우 (Settings에서)

비밀번호가 이미 있는 사용자가 변경:

```
새 비밀번호    JoinFormField + 요구사항 힌트
비밀번호 확인  JoinFormField

[비밀번호 변경]  variant="default"
```

**현재 비밀번호 확인을 요구하지 않음.** 이미 로그인된 세션이 충분한 인증. `updateUser({ password: newPassword })` 직접 호출.

성공 시: `toast.success('비밀번호가 변경되었습니다.')` → Settings로 돌아감.

`variant="default"` 사용: 신규 능력 추가가 아닌 기존 설정 갱신이므로 cta보다 한 단계 낮은 계층.

---

## 6. `IntroCTA` 업데이트

### 변경 내용

현재 두 버튼 (`handleSecondaryClick`, `handlePrimaryClick`) 모두 비로그인 상태에서 `onLogin(returnTo)` 호출.

변경: 비로그인 상태일 때 `/login`으로 navigate 후 `returnTo`를 state 또는 sessionStorage로 전달.

```tsx
const handlePrimaryClick = () => {
  if (isLoggedIn) {
    navigate(ROUTES.JOIN_FORM);
  } else {
    // 기존: onLogin(ROUTES.JOIN)
    // 변경: /login으로 이동, returnTo 저장
    sessionStorage.setItem('returnTo', ROUTES.JOIN);
    navigate(ROUTES.LOGIN);
  }
};

const handleSecondaryClick = () => {
  if (isLoggedIn) {
    navigate(ROUTES.BOARDS);
  } else {
    sessionStorage.setItem('returnTo', ROUTES.BOARDS);
    navigate(ROUTES.LOGIN);
  }
};
```

`onLogin` prop과 `useGoogleLoginWithRedirect` 훅은 `JoinIntroPage`에서 제거 가능. `IntroCTA`의 prop signature에서 `onLogin`이 불필요해짐 — 단계적으로 정리.

### 복사문 변경 불필요

버튼 텍스트 ("시작하기", "게시판 들어가기")는 그대로 유지. `/login`에서 구글/이메일 선택지를 제공하므로 마케팅 페이지에서 "이메일로도 가입 가능해요"를 별도 안내할 필요 없음. `/login` 자체가 그 역할.

### 대안 검토

**대안 A — 마케팅 페이지에 "이메일로도 가능합니다" 메모 추가:** 정보 과잉. 사용자는 CTA를 읽고 바로 행동하려 하지, 로그인 방법 안내를 읽으려 하지 않는다. **기각.**

**대안 B — 두 버튼을 각각 구글/이메일로 분리:** IntroCTA 레이아웃 구조를 크게 바꿔야 하고, 마케팅 페이지에 auth 선택 UI가 노출되는 것은 불필요한 복잡도. **기각.**

**권장:** `/login`으로 단순 이동, 복사문 유지.

---

## 신규 Auth 함수 계약 (구현 참고용)

| 함수명 | 역할 | Supabase API |
|--------|------|------|
| `signUpWithEmail(email, password)` | 이메일/비밀번호 신규 가입 | `signUp` |
| `signInWithEmail(email, password)` | 이메일/비밀번호 로그인 | `signInWithPassword` |
| `sendPasswordResetEmail(email)` | 비밀번호 재설정 링크 발송 | `resetPasswordForEmail` |
| `resendVerificationEmail(email)` | 인증 메일 재발송 | `auth.resend` |
| `setPasswordForCurrentUser(newPassword)` | 비밀번호 추가/변경 (로그인 상태) | `updateUser({ password })` |
| `isKakaoBrowser()` | Kakao 인앱 브라우저 감지 | (기존 `supabaseAuth.ts:13`) |

**계정 자동 연결은 별도 함수 불필요.** Supabase는 `signUp({ email, password })` 호출 시 동일 이메일의 기존 OAuth 사용자가 있으면 이메일 인증 완료 후 자동으로 identity를 연결한다 (automatic linking 기본 동작). 인증 전까지는 연결되지 않으므로 pre-account-takeover 공격이 차단됨.

**`signInWithTestCredentials` (기존, dev 전용)는 유지.** E2E 테스트에 사용 중. `signInWithEmail`과 별개로 둠.

---

## 결정 추적 (Decision Log)

브레인스토밍 단계에서 결정된 사항과 그 이유:

| 질문 | 결정 | 이유 |
|------|------|------|
| 누가 쓰는가? | 회사 방화벽으로 Google 막힌 기존 사용자 + Google 없는 신규 사용자 | 백업 인증 수단 필요 |
| 두 방법 노출 위치 | `/login`에 동시 노출 (탭 X) | 두 옵션 모두 1급 시민으로 인식 |
| 이메일 인증 | 가입 후 즉시 인증 요구 | 오타/봇 방지, 비밀번호 재설정 신뢰성 확보 |
| 라우트 구조 | `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/set-password` 분리 | 명확한 책임 분리, returnTo 처리 단순화 |
| 계정 충돌 처리 | Supabase automatic linking (기본 동작) | 별도 구현 불필요, 인증된 이메일만 연결되어 안전 |
| 기존 Google 사용자 비밀번호 추가 경로 | Settings에서만 가능 (MVP) | `/login`에서 매직링크 발송 옵션은 단순화를 위해 제외 |
| 비밀번호 변경 시 현재 비밀번호 확인 | 요구하지 않음 | 로그인 세션이 충분한 인증, 마찰 최소화 |
| Settings 비밀번호 추가 UI | 별도 페이지 | 모바일 키보드 + 다이얼로그 UX 회피 |
| Settings 행/페이지 카피 | "비밀번호 추가" → "로그인 수단 추가" 로 변경 | OAuth 사용자에게 "비밀번호 추가"는 모호함 ("Why would I add password after I already logged in?"). "한 계정 = 여러 로그인 방법" 멘탈 모델을 명시. ChangePasswordPage 는 변경 멘탈 모델이 정확하므로 유지 |
