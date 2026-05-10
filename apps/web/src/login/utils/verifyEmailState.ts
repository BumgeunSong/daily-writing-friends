/**
 * /verify-email state machine.
 * Tested by `verifyEmailState.test.ts`.
 *
 * Spike 2026-05-05 finding: Supabase merges expired and invalid tokens into a single
 * `otp_expired` (HTTP 403) error code. We collapse them to `invalid_or_expired`.
 * The `success-linked` UI state from the original design is dropped because Supabase
 * does not auto-link a new password identity on top of an existing Google identity —
 * Persona B is now redirected from SignupPage directly to /login.
 */

export type VerifyOtpOutcome =
  | { ok: true; providers: string[] }
  | { ok: false; errorCode: 'invalid_or_expired' | 'rate_limit' | 'unknown' };

export type VerifyState =
  | { kind: 'entry' }
  | { kind: 'success' }
  | { kind: 'locked' }
  | { kind: 'error-inline'; message: string };

const COPY = {
  invalidOrExpired: '인증 코드가 올바르지 않거나 만료되었습니다. 다시 받기를 눌러주세요.',
  unknown: '인증에 실패했습니다. 잠시 후 다시 시도해주세요.',
} as const;

export function decideVerifySuccessState(outcome: VerifyOtpOutcome): VerifyState {
  if (outcome.ok) return { kind: 'success' };
  switch (outcome.errorCode) {
    case 'rate_limit':
      return { kind: 'locked' };
    case 'invalid_or_expired':
      return { kind: 'error-inline', message: COPY.invalidOrExpired };
    case 'unknown':
    default:
      return { kind: 'error-inline', message: COPY.unknown };
  }
}
