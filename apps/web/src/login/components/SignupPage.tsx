import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ROUTES } from '@/login/constants';
import { validatePassword } from '@/login/utils/passwordValidation';
import { signUpWithEmail } from '@/shared/auth/supabaseAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import FormField from './JoinFormField';
import { PasswordRequirements } from './PasswordRequirements';

const signupSchema = z
  .object({
    email: z.string().email('올바른 이메일 형식이 아닙니다.'),
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

type SignupFormValues = z.infer<typeof signupSchema>;

function mapSignupErrorToKorean(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  if (msg.includes('already registered') || msg.includes('user already')) {
    return '이미 가입된 이메일입니다. 로그인해주세요.';
  }
  return '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.';
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', passwordConfirm: '' },
  });

  const passwordValue = watch('password') ?? '';

  const onSubmit = async ({ email, password }: SignupFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await signUpWithEmail(email, password);
      navigate(ROUTES.VERIFY_EMAIL, { state: { email } });
    } catch (err) {
      setSubmitError(mapSignupErrorToKorean(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-3 md:px-4'>
      <Card className='reading-shadow w-full max-w-md border-border/50'>
        <CardHeader>
          <CardTitle className='text-2xl font-semibold tracking-tight text-foreground'>
            회원가입
          </CardTitle>
          <p className='text-sm text-muted-foreground'>이메일로 계정을 만들어요.</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              id='email'
              label='이메일'
              type='email'
              inputMode='email'
              placeholder='you@example.com'
              register={register}
              error={errors.email}
            />

            <div className='space-y-2'>
              <FormField
                id='password'
                label='비밀번호'
                type='password'
                inputMode='text'
                placeholder='비밀번호'
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
              variant='cta'
              type='submit'
              disabled={isSubmitting}
              className='min-h-[44px] w-full'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='mr-2 size-4 animate-spin' />
                  가입 중...
                </>
              ) : (
                '회원가입'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className='justify-center pt-0 text-sm text-muted-foreground'>
          <span>이미 계정이 있으신가요? </span>
          <Link to={ROUTES.LOGIN} className='ml-1 text-ring hover:underline'>
            로그인
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
