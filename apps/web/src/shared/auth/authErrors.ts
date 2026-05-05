interface SupabaseAuthErrorLike {
  code?: string;
  message?: string;
}

function asAuthError(err: unknown): SupabaseAuthErrorLike | null {
  if (!err || typeof err !== 'object') return null;
  return err as SupabaseAuthErrorLike;
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
