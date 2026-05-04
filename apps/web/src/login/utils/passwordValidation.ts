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
