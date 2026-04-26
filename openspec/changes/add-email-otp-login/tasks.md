## 1. Auth API 확장

- [x] 1.1 `apps/web/src/shared/auth/supabaseAuth.ts`에 `sendEmailOtp(email)` 추가 — `signInWithOtp` 호출, `shouldCreateUser: false` 옵션
- [x] 1.2 `verifyEmailOtp(email, token)` 추가 — `verifyOtp({ type: 'email' })` 호출
- [x] 1.3 두 함수 모두 Supabase 에러 시 `throw error`

## 2. 2단계 흐름 훅

- [x] 2.1 `apps/web/src/login/hooks/useEmailOtpLogin.ts` 신규 생성
- [x] 2.2 `step: 'email' | 'code'` 상태 머신 구현
- [x] 2.3 `handleSendOtp` — 이메일 발송 후 `step='code'`로 전환
- [x] 2.4 `handleVerifyOtp(token)` — 검증, 성공 시 `onAuthStateChange`에 위임
- [x] 2.5 `handleBack` — `step='email'` 복귀 + 에러 초기화 (이메일 값은 유지)
- [x] 2.6 pure 함수 `toKoreanErrorMessage(err, step)`로 에러 메시지 한국어 매핑

## 3. LoginPage UI

- [x] 3.1 `useEmailOtpLogin` 훅 통합, Google 훅과 별도 loading/error 분리
- [x] 3.2 구글 버튼 아래에 `Separator` + "또는" 구분선 배치
- [x] 3.3 이메일 단계 폼 (Input + outline Button, `min-h-[44px]`)
- [x] 3.4 코드 단계 폼 (안내 문구 + 6자리 숫자 입력란 + "로그인" + "이메일 다시 입력하기")
- [x] 3.5 코드 입력란 `inputMode='numeric'`, `maxLength=6`, 비숫자 제거(`replace(/\D/g, '')`)
- [x] 3.6 6자리 미만일 때 "로그인" 버튼 disabled

## 4. 운영 인프라 (코드 외)

- [ ] 4.1 Supabase Dashboard > Authentication > Providers > Email 활성화 확인
- [ ] 4.2 SMTP 설정 (Resend 권장) — 시간당 2통 기본 제한 회피
- [ ] 4.3 이메일 템플릿(Magic Link 슬롯)에 `{{ .Token }}` 추가 — 6자리 코드가 메일에 노출되도록
- [ ] 4.4 `email_sent` rate limit 5~10/시간으로 상향 검토
- [ ] 4.5 Automatic identity linking 설정 ON 확인 (기본값)

## Tests

### Unit

- [x] T.1 `toKoreanErrorMessage`: `"Signups not allowed"` → "등록되지 않은 이메일입니다." (Vitest)
- [x] T.2 `toKoreanErrorMessage`: 일반 Error + step='code' → "인증 코드가 올바르지 않습니다." (Vitest)
- [x] T.3 `toKoreanErrorMessage`: 일반 Error + step='email' → "오류가 발생했습니다. 다시 시도해주세요." (Vitest)
- [x] T.4 `toKoreanErrorMessage`: non-Error throw (string) → step별 분기 적용 (Vitest)

  → `apps/web/src/login/utils/otpErrorMessages.ts`로 추출, `otpErrorMessages.test.ts`에 5개 케이스 (5/5 pass)

### Integration

- [ ] T.5 `sendEmailOtp` ↔ Supabase local: 등록된 이메일 → Inbucket에 6자리 메일 도착 확인 (Vitest + Supabase local Docker)
- [ ] T.6 `sendEmailOtp` ↔ Supabase local: 미등록 이메일 → "Signups not allowed" 에러 (Vitest + Supabase local Docker)
- [ ] T.7 `verifyEmailOtp` ↔ Supabase local: 올바른 OTP → 세션 생성 + SIGNED_IN 이벤트 (Vitest + Supabase local Docker)
- [ ] T.8 `verifyEmailOtp` ↔ Supabase local: 잘못된 OTP → 에러 + 세션 미생성 (Vitest + Supabase local Docker)

### E2E

- [ ] T.9 정상 로그인 흐름: 이메일 입력 → Inbucket에서 코드 추출 → 코드 입력 → 메인 진입 (agent-browser + dev3000 + Supabase local Docker)
- [ ] T.10 미등록 이메일: "등록되지 않은 이메일입니다." 노출, step 유지 (agent-browser)
- [ ] T.11 잘못된 코드: "인증 코드가 올바르지 않습니다." 노출, 입력란 유지 (agent-browser)
- [ ] T.12 "이메일 다시 입력하기" 클릭 → step='email' 복귀, 이메일 값 유지 (agent-browser)
- [ ] T.13 Identity linking (Layer 4): Google OAuth로 가입한 user의 이메일로 OTP 로그인 후 `auth.users`의 user.id 동일 + `auth.identities`에 google·email 두 행 (agent-browser + Supabase local Docker)
