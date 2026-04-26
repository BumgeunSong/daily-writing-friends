import { useState, useCallback } from 'react';
import { sendEmailOtp, verifyEmailOtp } from '@/shared/auth/supabaseAuth';

type Step = 'email' | 'code';

interface UseEmailOtpLoginReturn {
  step: Step;
  email: string;
  setEmail: (email: string) => void;
  isLoading: boolean;
  error: string | null;
  handleSendOtp: () => Promise<void>;
  handleVerifyOtp: (token: string) => Promise<void>;
  handleBack: () => void;
}

function toKoreanErrorMessage(err: unknown, step: Step): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('Signups not allowed')) {
    return '등록되지 않은 이메일입니다.';
  }
  if (step === 'code') {
    return '인증 코드가 올바르지 않습니다.';
  }
  return '오류가 발생했습니다. 다시 시도해주세요.';
}

export function useEmailOtpLogin(): UseEmailOtpLoginReturn {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await sendEmailOtp(email);
      setStep('code');
    } catch (err) {
      setError(toKoreanErrorMessage(err, 'email'));
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const handleVerifyOtp = useCallback(async (token: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await verifyEmailOtp(email, token);
      // onAuthStateChange handles session — no navigation needed here.
    } catch (err) {
      setError(toKoreanErrorMessage(err, 'code'));
      setIsLoading(false);
    }
  }, [email]);

  const handleBack = useCallback(() => {
    setStep('email');
    setError(null);
  }, []);

  return { step, email, setEmail, isLoading, error, handleSendOtp, handleVerifyOtp, handleBack };
}
