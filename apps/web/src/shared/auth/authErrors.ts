interface SupabaseAuthErrorLike {
  code?: string;
  message?: string;
}

function asAuthError(err: unknown): SupabaseAuthErrorLike | null {
  if (!err || typeof err !== 'object') return null;
  return err as SupabaseAuthErrorLike;
}

/**
 * True when Supabase rejects signUp because the email already has an account.
 * Detected by either the `user_already_exists` code (preferred) or the
 * canonical "User already registered" message Supabase Auth returns.
 *
 * Why callers care: for OAuth-linked accounts Supabase still sends a
 * verification email and the link click triggers automatic identity linking.
 * UIs should funnel the user to the verify-email flow rather than block them
 * with a hard error.
 */
export function isAlreadyRegisteredError(err: unknown): boolean {
  const e = asAuthError(err);
  if (!e) return false;
  if (e.code === 'user_already_exists') return true;
  const msg = e.message?.toLowerCase() ?? '';
  return msg.includes('already registered') || msg.includes('user already');
}

export function mapSetPasswordErrorToKorean(err: unknown): string {
  const e = asAuthError(err);
  const code = e?.code;
  const message = e?.message?.toLowerCase() ?? '';

  if (code === 'same_password' || message.includes('should be different')) {
    return '이미 이 비밀번호로 등록되어 있어요. 다른 비밀번호를 시도해주세요.';
  }
  if (code === 'weak_password') {
    return '비밀번호가 너무 약해요. 더 복잡한 비밀번호를 사용해주세요.';
  }
  return '저장에 실패했습니다. 잠시 후 다시 시도해주세요.';
}
