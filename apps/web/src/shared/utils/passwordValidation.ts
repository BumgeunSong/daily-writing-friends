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

export interface PasswordHint {
  text: string;
  ok: boolean;
}

const MIN_PASSWORD_LENGTH = 8;

export function passwordHint(password: string): PasswordHint {
  if (!password) {
    return { text: '8자 이상, 영문과 숫자를 포함해주세요.', ok: false };
  }
  const checks = passwordChecks(password);
  if (!checks.isLongEnough) {
    const remaining = MIN_PASSWORD_LENGTH - password.length;
    return { text: `${remaining}자 더 입력해주세요.`, ok: false };
  }
  if (!checks.hasLetter) return { text: '영문을 포함해주세요.', ok: false };
  if (!checks.hasNumber) return { text: '숫자를 포함해주세요.', ok: false };
  return { text: '✓ 사용할 수 있는 비밀번호예요', ok: true };
}
