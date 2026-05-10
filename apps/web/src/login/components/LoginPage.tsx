import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ROUTES } from '@/login/constants';
import { useEmailLogin } from '@/login/hooks/useEmailLogin';
import { useGoogleLoginWithRedirect } from '@/login/hooks/useGoogleLoginWithRedirect';
import { useAuth } from '@/shared/hooks/useAuth';
import { isSafeReturnTo } from '@/shared/utils/routingDecisions';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import FormField from './JoinFormField';

const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function isKakaoBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.toLowerCase().includes('kakaotalk');
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const { handleLogin: handleGoogleLogin, isLoading: isGoogleLoading, error: googleError } =
    useGoogleLoginWithRedirect();
  const { handleLogin: handleEmailLogin, isLoading: isEmailLoading, error: emailError } =
    useEmailLogin();

  // 이메일 로그인은 OAuth 라운드트립이 없어서 PublicRoutes 가 자동 리다이렉트하지 않음.
  // currentUser 가 set 되는 즉시(이메일 로그인 성공 / 이미 로그인된 채 /login 진입) 명시적으로 이동.
  useEffect(() => {
    if (loading || !currentUser) return;
    const returnTo = sessionStorage.getItem('returnTo');
    if (returnTo) sessionStorage.removeItem('returnTo');
    const target = isSafeReturnTo(returnTo) ? returnTo! : ROUTES.BOARDS;
    navigate(target, { replace: true });
  }, [currentUser, loading, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (loading) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center bg-background'>
        <Loader2 className='mb-4 size-12 animate-spin text-primary' />
        <p className='text-lg font-medium text-muted-foreground'>로그인 중...</p>
      </div>
    );
  }

  const onSubmit = ({ email, password }: LoginFormValues) => handleEmailLogin(email, password);

  const showKakaoBanner = isKakaoBrowser();

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-3 md:px-4'>
      <Card className='reading-shadow w-full max-w-md border-border/50'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-semibold tracking-tight text-foreground md:text-3xl'>
            매일 글쓰기 프렌즈
          </CardTitle>
          <div className='flex justify-center pt-2'>
            <img src='/pencil_icon.svg' alt='Logo' className='size-12' />
          </div>
        </CardHeader>

        <CardContent className='space-y-4'>
          {showKakaoBanner && (
            <div className='rounded-md border border-border/50 bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground'>
              카카오톡에서 열었을 때는 <span className='font-medium text-foreground'>이메일 로그인</span>을 이용해주세요.
            </div>
          )}

          <div className='space-y-2'>
            <Button
              variant='default'
              onClick={() => handleGoogleLogin()}
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
          </div>

          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t border-border/50' />
            </div>
            <div className='relative flex justify-center text-xs'>
              <span className='bg-card px-3 text-muted-foreground'>또는</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              id='email'
              label='이메일'
              type='email'
              inputMode='email'
              autoComplete='email'
              placeholder='you@example.com'
              register={register}
              error={errors.email}
            />
            <FormField
              id='password'
              label='비밀번호'
              type='password'
              inputMode='text'
              autoComplete='current-password'
              placeholder='비밀번호를 입력해주세요'
              register={register}
              error={errors.password}
            />

            {emailError && (
              <p className='text-sm text-destructive'>{emailError.message}</p>
            )}

            <Button
              variant='default'
              type='submit'
              disabled={isEmailLoading}
              className='min-h-[44px] w-full'
            >
              {isEmailLoading ? (
                <>
                  <Loader2 className='mr-2 size-4 animate-spin' />
                  로그인 중...
                </>
              ) : (
                '이메일로 로그인'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className='flex justify-between pt-0 text-sm'>
          <Link to={ROUTES.FORGOT_PASSWORD} className='text-ring hover:underline'>
            비밀번호를 잊으셨나요?
          </Link>
          <Link to={ROUTES.SIGNUP} className='text-ring hover:underline'>
            회원가입
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
