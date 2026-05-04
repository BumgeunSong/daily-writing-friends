import { useState, useCallback } from 'react';
import { signInWithEmail } from '@/shared/auth/supabaseAuth';

export function mapAuthErrorToKorean(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  if (msg.includes('email not confirmed')) return '이메일 인증이 필요합니다.';
  if (msg.includes('invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  return '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.';
}

interface UseEmailLoginReturn {
  handleLogin: (email: string, password: string, returnTo?: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useEmailLogin(): UseEmailLoginReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleLogin = useCallback(async (email: string, password: string, returnTo?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      if (returnTo) sessionStorage.setItem('returnTo', returnTo);
      await signInWithEmail(email, password);
    } catch (err) {
      setError(new Error(mapAuthErrorToKorean(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { handleLogin, isLoading, error };
}
