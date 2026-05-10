import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ROUTES } from '@/login/constants';
import {
  decideVerifySuccessState,
  type VerifyState,
} from '@/login/utils/verifyEmailState';
import { resendVerificationEmail, verifyOtpForSignup } from '@/shared/auth/supabaseAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';

const RESEND_COOLDOWN_SECONDS = 30;
const PENDING_EMAIL_KEY = 'pendingVerificationEmail';

function readEmailFromLocationState(state: unknown): string | null {
  if (!state || typeof state !== 'object') return null;
  const v = (state as Record<string, unknown>).email;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateEmail = readEmailFromLocationState(location.state);
  const [email] = useState(() => {
    if (stateEmail) {
      sessionStorage.setItem(PENDING_EMAIL_KEY, stateEmail);
      return stateEmail;
    }
    return sessionStorage.getItem(PENDING_EMAIL_KEY) ?? '';
  });

  // /verify-email is a public route, so a user can land here directly with no
  // pending email in sessionStorage and no router state. Without this guard the
  // OTP form would silently no-op on submit (handleVerify early-returns when
  // `email` is empty) AND the resend button stays disabled — a dead-end UI.
  // Send them back to /signup so they can retry from a sensible starting point.
  useEffect(() => {
    if (!email) navigate(ROUTES.SIGNUP, { replace: true });
  }, [email, navigate]);

  const [state, setState] = useState<VerifyState>({ kind: 'entry' });
  const [token, setToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-redirect after success.
  useEffect(() => {
    if (state.kind === 'success') {
      toast.success('인증 완료', { position: 'bottom-center' });
      navigate(ROUTES.ONBOARDING, { replace: true });
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
    }
  }, [state.kind, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || token.length !== 6 || isVerifying) return;
    try {
      setIsVerifying(true);
      const outcome = await verifyOtpForSignup(email, token);
      setState(decideVerifySuccessState(outcome));
    } catch (err) {
      console.error('VerifyEmailPage handleVerify unexpected error', err);
      setState({
        kind: 'error-inline',
        message: '인증에 실패했습니다. 잠시 후 다시 시도해주세요.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0 || isResending || state.kind === 'locked') return;
    try {
      setIsResending(true);
      await resendVerificationEmail(email);
      toast.success('인증 코드를 다시 보냈습니다.', { position: 'bottom-center' });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setToken('');
      setState({ kind: 'entry' });
    } catch (err) {
      console.error('VerifyEmailPage handleResend error', err);
      toast.error('재발송에 실패했습니다. 잠시 후 다시 시도해주세요.', {
        position: 'bottom-center',
      });
    } finally {
      setIsResending(false);
    }
  };

  const isLocked = state.kind === 'locked';
  const errorMessage = state.kind === 'error-inline' ? state.message : null;

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-3 md:px-4'>
      <Card className='reading-shadow w-full max-w-md border-border/50'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-semibold tracking-tight text-foreground'>
            이메일 인증
          </CardTitle>
        </CardHeader>

        <CardContent className='space-y-4'>
          {email ? (
            <p className='text-sm text-foreground text-pretty text-center'>
              <span className='font-medium'>{email}</span>로 6자리 인증 코드를 보냈어요.
            </p>
          ) : (
            <p className='text-sm text-foreground text-pretty text-center'>
              가입한 이메일로 6자리 인증 코드를 보냈어요.
            </p>
          )}

          <form onSubmit={handleVerify} className='space-y-3'>
            <Input
              id='otp'
              type='text'
              inputMode='numeric'
              autoComplete='one-time-code'
              maxLength={6}
              // pattern dropped on purpose: in a JSX attribute the string is
              // a JS literal, so `'\d{6}'` evaluates to `'d{6}'` and the HTML5
              // validator would reject every numeric code. The onChange digit
              // filter below already enforces the actual constraint.
              aria-label='인증 코드'
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className='h-12 text-center text-2xl tracking-[0.5em]'
              disabled={isLocked || isVerifying}
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={errorMessage ? 'otp-error' : undefined}
            />
            {errorMessage && (
              <p id='otp-error' className='text-sm text-destructive' role='alert'>
                {errorMessage}
              </p>
            )}
            {isLocked && (
              <div className='rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive'>
                <p className='font-medium'>인증 시도가 너무 많습니다.</p>
                <p className='mt-1'>잠시 후 다시 시도해주세요. (최대 1시간)</p>
                <p className='mt-2 text-xs'>
                  계속 문제가 발생하면 <a className='underline' href='mailto:dailywritingfriends@gmail.com'>dailywritingfriends@gmail.com</a>로 알려주세요.
                </p>
              </div>
            )}
            <Button
              variant='cta'
              type='submit'
              disabled={token.length !== 6 || isVerifying || isLocked}
              className='min-h-[44px] w-full'
            >
              {isVerifying ? '확인 중...' : '인증 확인'}
            </Button>
          </form>

          <Button
            variant='outline'
            onClick={handleResend}
            disabled={!email || cooldown > 0 || isResending || isLocked}
            className='min-h-[44px] w-full'
          >
            {cooldown > 0
              ? `다시 받기 (${cooldown}초 후)`
              : isResending
                ? '재발송 중...'
                : '인증 코드 다시 받기'}
          </Button>
        </CardContent>

        <CardFooter className='justify-center pt-0'>
          <Button
            variant='ghost'
            onClick={() => navigate(ROUTES.LOGIN)}
            className='text-muted-foreground'
          >
            로그인 화면으로
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
