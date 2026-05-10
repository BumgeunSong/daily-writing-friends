import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { ROUTES } from '@/login/constants';
import { validatePassword } from '@/login/utils/passwordValidation';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { mapSetPasswordErrorToKorean } from '@/shared/auth/authErrors';
import { setPasswordForCurrentUser } from '@/shared/auth/supabaseAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import FormField from './JoinFormField';
import { PasswordRequirements } from './PasswordRequirements';

const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, '비밀번호를 입력해주세요.')
      .refine((val) => validatePassword(val) === null, {
        message: '비밀번호 요구사항을 확인해주세요.',
      }),
    passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

type RecoveryStatus = 'checking' | 'active' | 'invalid';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>('checking');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;

    // Recovery sessions only: a `type=recovery` URL hash, or a PASSWORD_RECOVERY event.
    // A pre-existing INITIAL_SESSION must be ignored — otherwise any logged-in user
    // landing on this URL would see a password-change form not gated by re-auth.
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const hasRecoveryHash = /[#&]type=recovery(&|$)/.test(hash);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryStatus('active');
      }
    });

    // If the URL has a recovery token, AuthProvider may have already consumed
    // PASSWORD_RECOVERY before this page mounted. Inspect the current session
    // explicitly so we don't show "expired" just because we missed the event.
    if (hasRecoveryHash) {
      supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        setRecoveryStatus(data.session ? 'active' : 'invalid');
      });
    } else {
      // No hash → wait briefly for the event in case routing was internal,
      // then mark invalid. The form requires a recovery session to be useful.
      const fallback = setTimeout(() => {
        if (!cancelled) {
          setRecoveryStatus((prev) => (prev === 'checking' ? 'invalid' : prev));
        }
      }, 800);
      return () => {
        cancelled = true;
        subscription.unsubscribe();
        clearTimeout(fallback);
      };
    }

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  const passwordValue = watch('password') ?? '';

  const onSubmit = async ({ password }: SetPasswordFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await setPasswordForCurrentUser(password);
      toast.success('비밀번호가 설정되었습니다.', { position: 'bottom-center' });
      const returnTo = sessionStorage.getItem('returnTo');
      // Only honor app-internal paths to avoid open-redirect surprises.
      const safeReturnTo =
        returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
          ? returnTo
          : null;
      if (safeReturnTo) sessionStorage.removeItem('returnTo');
      navigate(safeReturnTo ?? ROUTES.BOARDS);
    } catch (err) {
      setSubmitError(mapSetPasswordErrorToKorean(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-3 md:px-4'>
      <Card className='reading-shadow w-full max-w-md border-border/50'>
        <CardHeader>
          <CardTitle className='text-2xl font-semibold tracking-tight text-foreground'>
            비밀번호 재설정
          </CardTitle>
          <p className='text-sm text-muted-foreground'>새로운 비밀번호를 설정해주세요.</p>
        </CardHeader>

        <CardContent>
          {recoveryStatus === 'checking' && (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='size-6 animate-spin text-muted-foreground' />
            </div>
          )}

          {recoveryStatus === 'invalid' && (
            <div className='space-y-3'>
              <div className='rounded-md border border-border/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive'>
                링크가 만료되었습니다. 다시 요청해주세요.
              </div>
              <Button
                variant='outline'
                onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
                className='min-h-[44px] w-full'
              >
                새 링크 요청
              </Button>
            </div>
          )}

          {recoveryStatus === 'active' && (
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
              <div className='space-y-2'>
                <FormField
                  id='password'
                  label='새 비밀번호'
                  type='password'
                  inputMode='text'
                  placeholder='새 비밀번호'
                  register={register}
                  error={errors.password}
                />
                <PasswordRequirements password={passwordValue} />
              </div>

              <FormField
                id='passwordConfirm'
                label='비밀번호 확인'
                type='password'
                inputMode='text'
                placeholder='비밀번호를 한 번 더 입력해주세요'
                register={register}
                error={errors.passwordConfirm}
              />

              {submitError && (
                <p className='text-sm text-destructive'>{submitError}</p>
              )}

              <Button
                variant='default'
                type='submit'
                disabled={isSubmitting}
                className='min-h-[44px] w-full'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 size-4 animate-spin' />
                    저장 중...
                  </>
                ) : (
                  '비밀번호 저장'
                )}
              </Button>
            </form>
          )}
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
