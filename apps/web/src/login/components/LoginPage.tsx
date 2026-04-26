import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Separator } from '@/shared/ui/separator';
import { useGoogleLoginWithRedirect } from '@/login/hooks/useGoogleLoginWithRedirect';
import { useEmailOtpLogin } from '@/login/hooks/useEmailOtpLogin';

export default function LoginPage() {
  const { loading } = useAuth();
  const { handleLogin, isLoading: isGoogleLoading, error: googleError } = useGoogleLoginWithRedirect();
  const {
    step, email, setEmail, isLoading: isOtpLoading, error: otpError,
    handleSendOtp, handleVerifyOtp, handleBack,
  } = useEmailOtpLogin();
  const [otpCode, setOtpCode] = useState('');

  if (loading) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center bg-background'>
        <Loader2 className='mb-4 size-12 animate-spin text-primary' />
        <p className='text-lg font-medium text-muted-foreground'>로그인 중...</p>
      </div>
    );
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-3 md:px-4'>
      <Card className='reading-shadow w-full max-w-md border-border/50'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-semibold tracking-tight text-foreground md:text-3xl'>매일 글쓰기 프렌즈</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='mb-6 flex justify-center'>
            <img src='/pencil_icon.svg' alt='Logo' className='size-16' />
          </div>
        </CardContent>
        <CardFooter className='flex-col gap-2'>
          <Button
            variant="default"
            onClick={() => handleLogin()}
            disabled={isGoogleLoading}
            className='min-h-[44px] w-full'
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className='mr-2 size-4 animate-spin' />
                로그인 중...
              </>
            ) : (
              '구글로 로그인하기'
            )}
          </Button>
          {googleError && (
            <p className='text-sm text-destructive'>{googleError.message}</p>
          )}

          <div className='flex w-full items-center gap-3 py-2'>
            <Separator className='flex-1' />
            <span className='text-xs text-muted-foreground'>또는</span>
            <Separator className='flex-1' />
          </div>

          {step === 'email' ? (
            <form
              className='flex w-full flex-col gap-2'
              onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}
            >
              <Input
                type='email'
                placeholder='이메일 주소'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className='min-h-[44px]'
              />
              <Button
                type='submit'
                variant='outline'
                disabled={isOtpLoading || !email}
                className='min-h-[44px] w-full'
              >
                {isOtpLoading ? (
                  <>
                    <Loader2 className='mr-2 size-4 animate-spin' />
                    전송 중...
                  </>
                ) : (
                  '이메일로 인증 코드 받기'
                )}
              </Button>
            </form>
          ) : (
            <form
              className='flex w-full flex-col gap-2'
              onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(otpCode); }}
            >
              <p className='text-center text-sm text-muted-foreground'>
                <span className='font-medium text-foreground'>{email}</span>
                {' '}으로 전송된
                <br />
                6자리 인증 코드를 입력해주세요
              </p>
              <Input
                type='text'
                inputMode='numeric'
                maxLength={6}
                placeholder='인증 코드 6자리'
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                required
                className='min-h-[44px] text-center text-lg tracking-widest'
              />
              <Button
                type='submit'
                variant='outline'
                disabled={isOtpLoading || otpCode.length !== 6}
                className='min-h-[44px] w-full'
              >
                {isOtpLoading ? (
                  <>
                    <Loader2 className='mr-2 size-4 animate-spin' />
                    확인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </Button>
              <button
                type='button'
                onClick={handleBack}
                className='text-sm text-muted-foreground underline hover:text-foreground'
              >
                이메일 다시 입력하기
              </button>
            </form>
          )}

          {otpError && (
            <p className='text-sm text-destructive'>{otpError}</p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
