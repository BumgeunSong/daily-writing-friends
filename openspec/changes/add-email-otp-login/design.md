## Context

현재 인증은 Supabase Auth + Google OAuth(redirect flow) 단일 경로다.

```
[LoginPage] ──signInWithOAuth(google)──▶ [Supabase Auth] ──redirect──▶ [Google]
                                                                          │
[useAuth] ◀──onAuthStateChange(SIGNED_IN)── [Supabase session] ◀──callback
```

회사 PC에서 일부 사용자는 개인 구글 OAuth가 차단되어 이 경로 자체가 막힌다. 폰으로 메일 수신은 가능하므로, 이메일을 채널로 한 OTP 인증 경로를 같은 Supabase 계정에 연결되도록 추가한다.

Supabase는 `signInWithOtp` + `verifyOtp` 조합으로 OTP를 지원하며, 같은 이메일을 가진 다른 provider(Google)와 user를 자동으로 연결하는 automatic identity linking 기능이 기본 ON이다.

## Goals / Non-Goals

**Goals:**
- 등록된(=Google OAuth로 이미 가입한) 사용자가 OAuth 차단 환경에서도 같은 계정으로 로그인 가능
- OTP 로그인 후 세션은 Google 로그인 때와 동일한 user.id를 가짐 (데이터 분리 없음)
- 신규 가입 경로는 추가하지 않음 — Google OAuth로만 가입
- 라우팅·세션 코드 변경 최소화 (`onAuthStateChange` 재사용)

**Non-Goals:**
- 비밀번호 로그인 추가 (운영 부담만 늘리고 차단 우회 효과는 동일)
- Magic link 로그인 (코드 입력 방식이 폰→PC 시나리오에 더 적합)
- OTP 전용 신규 가입 경로
- SMS OTP (이메일이면 충분, 운영 비용 추가 회피)
- 이메일 OTP 로그인 빈도/실패 분석 대시보드 (별도 작업)

## Decisions

### 1. `shouldCreateUser: false`로 신규 가입 차단

`signInWithOtp` 옵션에 `shouldCreateUser: false`를 강제한다.

**Why this over alternatives:**
- 등록되지 않은 이메일에는 OTP가 전송되지 않아 abuse·spam 우회로가 막힘
- 운영 정책상 가입 흐름은 Google OAuth 단일로 유지 (검증된 도메인 제약을 두고 있다면 그대로 유지됨)
- 대안으로 신규 가입을 허용하면 user metadata(displayName, avatar)가 비어 있는 부실 계정이 생김 → 별도 onboarding flow가 필요해짐

### 2. 2-step 상태 머신을 훅으로 캡슐화 (`useEmailOtpLogin`)

`step: 'email' | 'code'` 상태로 화면 전환을 관리하는 단일 훅.

**Why:**
- LoginPage가 OTP 로직 내부 상태(loading, error, email)를 직접 들고 있으면 비대해짐
- 훅 안에 두면 재사용·교체·테스트가 용이 (다만 훅 자체는 단위 테스트 안 함 — 아래 Testability 참조)

**대안 고려:** XState 등 상태 머신 라이브러리 — 2개 상태에 과한 도구라 거절.

### 3. 에러 메시지 한국어 매핑은 pure 함수로

Supabase가 반환하는 에러 message를 한국어 문구로 매핑하는 `toKoreanErrorMessage(err, step)`를 훅 내부 pure 함수로 둔다.

**Why:**
- 사용자 노출 문구는 일관된 한국어 톤 유지가 중요 (앱 전체가 한국어 UI)
- pure 함수라 Layer 1 unit test로 검증 가능
- 매핑 규칙: `"Signups not allowed"` → "등록되지 않은 이메일입니다.", code step 일반 에러 → "인증 코드가 올바르지 않습니다.", 그 외 → "오류가 발생했습니다. 다시 시도해주세요."

### 4. 세션 처리는 `onAuthStateChange`에 위임

`verifyOtp`가 성공하면 Supabase가 자동으로 SIGNED_IN 이벤트를 발생시킨다. 기존 `useAuth`의 listener가 이를 받아 라우팅·user 컨텍스트를 업데이트한다.

**Why:**
- Google OAuth와 정확히 동일한 흐름 → 라우팅 로직 분기 불필요
- 훅 안에서 navigate를 직접 호출하면 SIGNED_IN 이벤트 처리와 경합 발생 가능

### 5. Identity linking은 Supabase 기본 동작에 의존 (코드 변경 없음)

같은 이메일을 가진 Google identity가 이미 있는 user에 OTP 로그인이 들어오면 Supabase가 동일 user.id로 묶어준다 (Dashboard `Allow same email` 옵션 ON 기본값).

**Why:**
- Supabase auth.users 스키마는 `email` 컬럼이 unique → 자동 매칭
- 수동으로 `linkIdentity` 호출하면 OAuth 토큰이 필요해 OTP 흐름과 안 맞음

**Risk if violated:** Dashboard에서 identity linking이 OFF로 설정되어 있으면 별도 user가 생성됨 — 마이그레이션 시점에 검증 필요 (운영 체크리스트에 포함).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| SMTP 미설정 시 OTP 메일 미발송 | 운영 배포 체크리스트에 SMTP 설정 명시 (Resend 권장). 배포 전 staging에서 메일 수신 검증 |
| 이메일 템플릿이 magic link 기본 → 6자리 코드 미노출 | 템플릿에 `{{ .Token }}` 추가 명시, 배포 전 dry-run 발송 |
| OTP rate limit (시간당 2통)로 사용자가 막힘 | rate limit을 5~10/시간으로 상향, 동일 이메일에 대한 빠른 재시도는 클라이언트에서 쿨다운 표시 (이번 change에선 미포함, follow-up) |
| Identity linking이 OFF면 별도 user 생성 | Supabase Dashboard 설정 검증 단계를 verify 단계에 포함 |
| 등록되지 않은 이메일에 대해 "Signups not allowed" 노출 → 가입 여부 enumeration | 위험도 낮음(Google OAuth 가입 화면도 동일 정보 노출). 따로 mitigation 없음 |
| OTP 6자리 brute force | Supabase 서버단에서 시도 횟수 제한 + 1시간 만료 (`otp_expiry = 3600`)로 충분 |

## Testability Notes

### Unit (Layer 1)

- `toKoreanErrorMessage(err, step)` — pure 함수. 입력별 출력 매핑을 모두 검증.
  - `"Signups not allowed"` → "등록되지 않은 이메일입니다."
  - 일반 Error, step='code' → "인증 코드가 올바르지 않습니다."
  - 일반 Error, step='email' → "오류가 발생했습니다. 다시 시도해주세요."
  - non-Error throw (string) → "오류가 발생했습니다. 다시 시도해주세요."

### Integration (Layer 2)

- `sendEmailOtp` ↔ Supabase Auth: 로컬 Supabase에서 등록된 이메일에 대한 메일 발송 성공, 미등록 이메일에 대한 에러 반환을 verify
- `verifyOtp` ↔ Supabase Auth: 올바른 OTP로 SIGNED_IN 이벤트 발생, 잘못된 OTP에 대한 에러 반환

### E2E Network Passthrough (Layer 3)

- 로그인 페이지 → 이메일 입력 → "이메일로 인증 코드 받기" → Inbucket에서 코드 추출 → 코드 입력 → 로그인 성공 → 메인 진입
- 미등록 이메일 입력 시 한국어 에러 메시지 노출
- 잘못된 코드 입력 시 한국어 에러 메시지 노출, 입력란 유지
- "이메일 다시 입력하기" 버튼 클릭 시 step='email'로 복귀, 이메일 값 유지

### E2E Local DB (Layer 4)

- Google OAuth로 가입한 테스트 user의 이메일로 OTP 로그인 후, `auth.users`에서 user.id가 동일한지 확인 (identity linking 검증)
- 동일 user의 `auth.identities` 테이블에 `google` + `email` 두 행이 존재하는지 확인
