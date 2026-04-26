## Why

회사에서 발급된 컴퓨터에서 개인 구글 계정의 OAuth가 차단되어 로그인할 수 없는 사용자들이 생겼다 (issue #123). 현재 앱은 Supabase Auth + Google OAuth만 지원하므로, OAuth가 차단되었을 때 우회 수단이 없다. 폰으로는 코드를 받을 수 있다는 점을 활용해, 같은 계정에 연결되는 이메일 OTP 로그인을 대체 수단으로 추가한다.

## What Changes

- 로그인 페이지에 이메일 입력 → 6자리 인증 코드 수신 → 코드 검증의 2단계 흐름 추가
- Supabase의 `signInWithOtp` / `verifyOtp` API를 사용해 OTP 발급 및 검증
- `shouldCreateUser: false`로 기존 계정 전용으로 한정 (신규 가입은 여전히 Google OAuth로만 가능)
- Supabase의 automatic identity linking에 의존해, 동일 이메일로 가입된 Google 계정과 같은 user로 자동 연결 — 데이터·세션 분리 없음
- 로그인 페이지 UI에 구분선("또는") + 이메일 OTP 폼 추가 (구글 버튼 아래)

## Capabilities

### New Capabilities

- `email-otp-login`: 등록된 사용자가 이메일로 받은 6자리 OTP 코드로 기존 계정에 로그인할 수 있는 기능. 신규 가입은 차단되며, 동일 이메일의 다른 인증 수단(Google OAuth)과 자동으로 동일 user에 연결된다.

### Modified Capabilities

(없음 — 기존 Google OAuth 로그인은 그대로 유지)

## Impact

**코드:**
- `apps/web/src/shared/auth/supabaseAuth.ts` — `sendEmailOtp`, `verifyEmailOtp` 추가
- `apps/web/src/login/hooks/useEmailOtpLogin.ts` (신규) — 2단계 상태 머신 훅
- `apps/web/src/login/components/LoginPage.tsx` — UI 추가

**라우팅·세션:** `useAuth`의 `onAuthStateChange`가 SIGNED_IN 이벤트를 이미 처리하므로 **변경 없음**.

**Supabase 인프라 (코드 외, 운영 배포 전 필수):**
- Authentication > Providers > **Email 활성화**
- **SMTP 설정** (Resend/SendGrid 등) — 기본 SMTP는 시간당 2통 제한
- 이메일 템플릿에 `{{ .Token }}` 추가 (기본은 magic link라 6자리 코드가 안 보임)
- Automatic identity linking 활성화 확인 (기본 ON)
- `email_sent` rate limit 5~10/시간으로 상향 검토

**의존성:** 신규 npm 패키지 없음. `@supabase/supabase-js` 의 기존 메서드만 사용.
