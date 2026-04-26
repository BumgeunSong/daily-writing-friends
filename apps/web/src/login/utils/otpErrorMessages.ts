type OtpStep = 'email' | 'code';

const SIGNUP_BLOCKED_MARKER = 'Signups not allowed';

export function toKoreanErrorMessage(error: unknown, step: OtpStep): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes(SIGNUP_BLOCKED_MARKER)) {
    return '등록되지 않은 이메일입니다.';
  }
  if (step === 'code') {
    return '인증 코드가 올바르지 않습니다.';
  }
  return '오류가 발생했습니다. 다시 시도해주세요.';
}
