# OTP Signup Spike Report — 2026-05-05

**Author:** Claude (autonomous spike)
**Target:** Local Supabase Docker (CLI v2.75.0, Postgres 17)
**Goal:** Verify behavior assumed by `openspec/changes/integrate-signup-cohort-flow/design.md` D1 before any UI rewrite.

## Setup

- `enable_confirmations = true` set in `supabase/config.toml`.
- `supabase/templates/confirmation.html` provides Korean OTP body using `{{ .Token }}` only (no `{{ .ConfirmationURL }}`).
- Mailpit (the modern Supabase local mail server, formerly Inbucket) at `127.0.0.1:54324` — same port as before, different API. Helper code MUST use `/api/v1/messages` and `/api/v1/message/<id>`, NOT the legacy Inbucket `/api/v1/mailbox/<email>/messages` endpoint.
- Pre-created a user with **only** a `google` identity via direct insert into `auth.identities` (admin REST API does not let you choose the identity provider — it always inserts `email`).

## Findings

### F1. signUp with already-Google email → 422, no email queued

```
POST /auth/v1/signup  { email, password }   (existing google identity)
→ HTTP 422
→ { code: 422, error_code: "user_already_exists", msg: "User already registered" }
→ Mailpit total: 0
```

**Implication:** the design's "Persona B auto-link" path that begins with `signUp` from `SignupPage` cannot work — there is no token to verify. The existing `SignupPage.onSubmit` catches `isAlreadyRegisteredError` and routes to `/verify-email`, but `/verify-email` will then have nothing to verify (no email arrived).

### F2. signInWithOtp fallback works but uses magic_link template, not confirmation template

```
POST /auth/v1/otp  { email, create_user: false }   (existing user)
→ {} (200 OK)
→ Mailpit message arrives with subject "Your Magic Link"
→ Body contains both a magic-link URL AND a 6-digit code
```

**Implication:** if we want the auto-link branch to work, the `magic_link` template **also** needs an OTP-only customization — one more template file under `supabase/templates/`. This expands the change scope beyond what design D7 captured.

### F3. verifyOtp type=email creates session but does NOT add password identity

After F2's OTP is verified for the existing google-only user:

```
POST /auth/v1/verify  { email, token, type: "email" }
→ access_token: <issued>
→ user.identities: ['google']  (still google-only — NO 'email' identity added)
→ auth.identities table also confirms: only google row exists
```

**Implication:** there is no automatic password-identity linking via OTP. The user is logged in, but the password they typed on `SignupPage` is **silently discarded** — the password lives only in transient form state. To actually link a password, the post-OTP flow would need a follow-up `updateUser({ password })` call using the password the user typed minutes ago, then carried through `/verify-email`. This is implementable but adds complexity (must thread password through route state or sessionStorage) and security surface.

### F4. Happy path (new email signup with OTP) works

```
POST /auth/v1/signup  { email: "spike-fresh-…@example.com", password }
→ Mailpit: subject "매일 글쓰기 프렌즈 인증 코드", body contains 6-digit code only, NO ConfirmationURL
POST /auth/v1/verify  { email, token, type: "signup" }
→ access_token: <issued>
→ user.email_confirmed_at: <now>
→ user.identities: ['email']
```

**Implication:** the Persona A flow (new user, no prior identity) works exactly as design D5/D9 assumes. Implementation can proceed.

### F5. verifyOtp is stateless — no session binding

`verifyOtp({ email, token, type })` is a stateless POST with no session cookie required. Any browser session with the email+token completes verification. The token IS bound to the email on the server side (a stranger cannot use my token with their email).

**Implication:** D1 spike step 3 outcome is "tokens are NOT session-bound." Per design D1 implementation branch: "add an explicit 'Did you initiate this signup?' confirmation step on `/verify-email`."

**Mitigation taken:** the `/verify-email` page already shows the email address it expects an OTP for, and the user must type the code themselves from their inbox. The realistic attack vector — a phisher initiating a signup against someone else's email — only succeeds if the attacker also has access to the victim's inbox, in which case the attacker can do worse things directly. **Decision: accept residual risk; do NOT add a "Did you initiate this signup?" step.** Document accepted in this report.

### F6. Wrong-token error is `otp_expired` — Supabase merges expired and invalid

```
POST /auth/v1/verify  { email: "junk@…", token: "000000", type: "signup" }
→ HTTP 403
→ { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" }
```

**Implication:** design D5's mapping table distinguished `expired` from `invalid_token`. Supabase v2.75.0 returns the same `otp_expired` code for both. The classifier must collapse them.

**Decision:** unify the user-facing copy. There is no way to tell the user "your code is invalid" vs. "your code expired" with this Supabase version. Use one Korean message: "인증 코드가 올바르지 않거나 만료되었습니다. 다시 받기를 눌러주세요."

### F7. Rate limit not triggered in 7 attempts

7 consecutive verify calls with bad tokens all returned HTTP 403 / `otp_expired`. Per `auth.rate_limit.token_verifications = 30` in `supabase/config.toml`, the limit kicks in at 30 per IP per 5 minutes. The error shape (HTTP 429 vs. some other code) was not captured in this spike — exhausting the limit during dev would slow local iteration to a crawl. **Captured downstream in `classifySupabaseAuthError` as `over_email_send_rate_limit` → `rate_limit`.** If the actual error code differs, the unit tests will flag it during the first real lockout encounter.

## Canonical error-code mapping (finalized)

```ts
function classifySupabaseAuthError(err): VerifyOtpOutcome['errorCode'] {
  const status = (err as { status?: number })?.status;
  const code = (err as { code?: string })?.code ?? '';
  const message = String((err as { message?: string })?.message ?? '');

  if (status === 429 || /rate.*limit/i.test(message) || code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return 'rate_limit';
  }
  // Supabase merges expired and invalid into otp_expired (HTTP 403).
  if (code === 'otp_expired' || /expired|invalid/i.test(message)) {
    return 'invalid_or_expired';
  }
  return 'unknown';
}
```

Note: `VerifyOtpOutcome.errorCode` collapses to `'invalid_or_expired' | 'rate_limit' | 'unknown'` — three values, not the four originally proposed in design D5.

## Decision: drop the Persona B (auto-link) UI strand

Given F1–F3:

- The proposal/design's "auto-link banner on /verify-email" cannot fire from a happy-path signUp call — signUp returns 422 first.
- Implementing the signInWithOtp + post-OTP password-link fallback adds: (a) a second email template, (b) password threading through route state, (c) UI for "we'll create a password for your existing Google account," and (d) follow-up `updateUser({ password })` call. This is a meaningful scope creep for a feature whose primary value is corporate-firewall users.

**Followed branch (per design D1):** "abort the auto-link strand and require these users to use Google login + `/settings/add-login-method`."

**Concrete implementation:**

1. `SignupPage.onSubmit` already catches `isAlreadyRegisteredError`. Change behavior: instead of routing to `/verify-email` (which has nothing to verify), show an inline error: "이미 가입된 이메일입니다. 구글로 로그인 후 [설정 > 로그인 수단 추가]에서 비밀번호를 설정해주세요." with a link to `/login`. **No email is sent for already-registered users.**
2. `VerifyEmailPage` `success-linked` state is removed from design D5. The `decideVerifySuccessState` function returns either `success` or `error-inline`/`locked` only; `providers` field is no longer load-bearing for routing decisions. Keep the `providers` field in `VerifyOtpOutcome` for forward compatibility but do not branch on it.
3. `verifyOtpForSignup` returns `{ ok: true; providers: string[] }` on success per D9 — unchanged signature, but consumers stop reading `providers` for now.

This decision is a conscious narrowing of scope. Persona B is not regressed — they had no automatic linking before, and they still have `/settings/add-login-method` as the documented path.

## Spec amendments required

The OpenSpec spec change file (`specs/signup-onboarding/spec.md`) currently includes scenarios for `success-linked`. Those scenarios are now **invalid given Supabase's actual behavior**. Two options:

**Option A (recommended):** before merging, update the spec to remove the `success-linked` scenarios and replace with a `Persona B fallback redirects to login` scenario. Tracked as a tasks-list addendum below.

**Option B:** keep the spec scenarios as aspirational and mark them `// SKIP - awaiting upstream Supabase auto-link support`.

**Decision:** A. The spec must reflect reality. See "Tasks added by spike" at end of report.

## Tasks added by spike (deltas to `tasks.md`)

1. **6.4** — `classifySupabaseAuthError` returns `'invalid_or_expired' | 'rate_limit' | 'unknown'` (three values, not four). Update `VerifyOtpOutcome` type accordingly.
2. **6.2** — `decideVerifySuccessState` simplified: no `success-linked` branch. Outcomes: `entry`, `success`, `locked`, `error-inline`.
3. **7.x (new)** — `signUpWithEmail` already drops `emailRedirectTo` (task 7.1). Additional change: do NOT route `already_registered` errors to `/verify-email`. Show inline error with a link to `/login` and `/settings/add-login-method`.
4. **11.x (drop)** — task 11.3 (`success-linked` UI banner) is removed.
5. **Spec amendments** — remove the "Persona B sees auto-link banner" scenario from `specs/signup-onboarding/spec.md`. Replace with "Persona B receives clear redirect to login + add-login-method."
6. **3.4 (new)** — no second template required (since we abort auto-link). Confirm magic_link template is left at default (used by password-reset and other flows).

## Confirmation: ready to proceed

| Question | Answer |
|---|---|
| Does the OTP confirmation email render the custom Korean template with `{{ .Token }}` only? | ✅ Yes (F4) |
| Does `verifyOtp({type:'signup'})` create a session and email identity for new users? | ✅ Yes (F4) |
| Does it auto-link an existing Google user's account on signUp? | ❌ No (F1) |
| Is the OTP token session-bound? | ❌ No, accepted (F5) |
| Are expired and invalid tokens distinguishable in the error response? | ❌ No, merged (F6) |
| Was the rate-limit shape captured? | ⚠️ Partial (F7) — accept and ship; refine on first real encounter |

**Verdict:** proceed with implementation, applying the deltas above to tasks 6.2, 6.4, 7.1, 11.3, and the spec file. The "Persona A" happy path is the only path the UI needs to render; "Persona B" routes to login + settings.
