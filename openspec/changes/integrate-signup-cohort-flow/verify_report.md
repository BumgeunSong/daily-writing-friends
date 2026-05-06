# Verify Report — integrate-signup-cohort-flow

**Date:** 2026-05-06
**Range:** `22672f3e..ddc62c00` (10 implementation + 5 review-fix commits)
**Environment:** Local Supabase (Docker), Mailpit, Vite dev server `local-supabase` mode on port 5174, agent-browser

## Verification Matrix

### Static checks

| Gate | Result | Evidence |
|---|---|---|
| `tsc --noEmit` | ✅ pass | empty stdout, exit 0 |
| ESLint on modified files | ✅ 0 errors (29 pre-existing warnings) | full output captured during commit run |
| `vitest run` (full suite) | ✅ 709/709 pass across 55 files | last full-run output |

### Runtime — full UI flow

Captured via agent-browser screenshots, persisted in `/tmp/dwf-*.png` during the verify session.

| Spec scenario | Verified | Notes |
|---|---|---|
| New user receives 6-digit code (no URL in body) | ✅ | Mailpit subject: `매일 글쓰기 프렌즈 인증 코드`, body contains `\b\d{6}\b`, no `verify?token=` URL |
| User confirms with correct code → `/join/onboarding` | ✅ | `verify-1778076617@example.com`, OTP `945363`, post-verify URL `http://localhost:5174/join/onboarding` |
| Wrong code → inline Korean error, input still editable | ✅ | "인증 코드가 올바르지 않거나 만료되었습니다. 다시 받기를 눌러주세요." rendered in destructive color |
| Onboarding page renders profile + contact tab + cohort card | ✅ | Korean labels, segmented control, helper text "하나만 입력해주세요" |
| Phone tab submit → `phone_number=digits-only`, `kakao_id=null` | ✅ | DB row: `phone_number=01011112222`, `kakao_id=NULL`, `onboarding_complete=t` |
| Kakao tab submit → `kakao_id=trim(value)`, `phone_number=null` | ✅ | DB row: `kakao_id=kakao_user_01`, `phone_number=NULL`, `onboarding_complete=t` |
| Tab switching preserves inactive value | ✅ | Filled `010-1111-2222` on phone, switched to kakao tab, switched back, value still present |
| Submit with no upcoming cohort → `/boards` | ✅ | Final URL after submit: `/boards/list` (boards default tab); empty-state "어디로 들어갈까요?" rendered |
| `RootRedirect` for onboarded user with no cohort → `/join` | ✅ | `GET /` → `http://localhost:5174/join` |
| Dispatcher `/join/form` for onboarded user → `/join/onboarding` (re-apply surface) | ✅ | `GET /join/form` → `/join/onboarding`, profile fields pre-filled |
| Persona B (existing email): inline error, NO `/verify-email` funnel | ✅ | Re-submit on `/signup` for `verify-1778076617@example.com` stayed on `/signup` with "이미 가입된 이메일입니다…" message |

### DB-level constraints (from earlier SQL test runs)

| Constraint | Result |
|---|---|
| `users_kakao_id_format` rejects `<script>` payload | ✅ |
| `users_kakao_id_format` accepts `valid_id-123` | ✅ |
| `users_contact_required_when_onboarded` rejects onboarded row with NULL phone + NULL kakao | ✅ |
| Backfill: 4 fixture scenarios mark exactly the expected rows | ✅ |

## Findings during verification

None. The implementation matches every spec scenario exercised during the run.

Notes (not findings):

- The "no upcoming cohort" path lands on `/boards/list` (the default tab of `/boards`). The spec says navigate to `/boards`. The router decides which sub-page to render — same surface, just the default tab. Acceptable.
- The "인증 완료" toast remains visible briefly on `/join/onboarding` after the navigate — it is the success indicator the spec asks for.
- `JoinDispatcher`'s collapsed `!onboardingComplete` and fallthrough branches both go to `/join/onboarding`. This is by design D8: an onboarded-but-inactive user uses OnboardingPage as their re-apply surface (profile pre-fills, cohort card shows when one exists). Confirmed during the dispatcher hop test.

## Verdict

**Ready for merge.** Implementation matches spec scenarios. The remaining `Section 15` deploy steps (production dashboard template flip, `npm run canary:otp` against prod, `supabase db push`) must run by the merge author.
