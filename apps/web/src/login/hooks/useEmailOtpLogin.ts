import { useState, useCallback } from 'react';
import { sendEmailOtp, verifyEmailOtp } from '@/shared/auth/supabaseAuth';
import { toKoreanErrorMessage } from '@/login/utils/otpErrorMessages';

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
