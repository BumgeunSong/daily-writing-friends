import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ROUTES } from '@/login/constants';
import { resendVerificationEmail } from '@/shared/auth/supabaseAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';

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
  // Persist email to sessionStorage so refresh / direct entry doesn't break the resend button.
  const [email] = useState(() => {
    if (stateEmail) {
      sessionStorage.setItem(PENDING_EMAIL_KEY, stateEmail);
      return stateEmail;
    }
    return sessionStorage.getItem(PENDING_EMAIL_KEY) ?? '';
  });

  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0 || isResending) return;
    try {
      setIsResending(true);
      await resendVerificationEmail(email);
      toast.success('인증 메일을 다시 보냈습니다.', { position: 'bottom-center' });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      toast.error('재발송에 실패했습니다. 잠시 후 다시 시도해주세요.', {
        position: 'bottom-center',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-3 md:px-4'>
      <Card className='reading-shadow w-full max-w-md border-border/50'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-semibold tracking-tight text-foreground'>
            인증 메일을 보냈어요
          </CardTitle>
        </CardHeader>

        <CardContent className='flex flex-col items-center space-y-3 text-center'>
          <Mail className='size-12 text-muted-foreground' />

          {email ? (
            <p className='text-sm text-foreground text-pretty'>
              <span className='font-medium'>{email}</span>로 인증 링크를 보냈습니다. 메일함을 확인하고 링크를 클릭하면 로그인할 수 있어요.
            </p>
          ) : (
            <p className='text-sm text-foreground text-pretty'>
              가입한 이메일로 인증 링크를 보냈습니다. 메일함을 확인하고 링크를 클릭하면 로그인할 수 있어요.
            </p>
          )}

          <p className='text-xs text-muted-foreground'>스팸 메일함도 확인해보세요.</p>

          <Button
            variant='outline'
            onClick={handleResend}
            disabled={!email || cooldown > 0 || isResending}
            className='min-h-[44px] w-full'
          >
            {cooldown > 0
              ? `다시 받기 (${cooldown}초 후)`
              : isResending
                ? '재발송 중...'
                : '인증 메일 다시 받기'}
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
