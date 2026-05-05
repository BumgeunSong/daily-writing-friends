import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import FormField from '@/login/components/JoinFormField';
import { PasswordRequirements } from '@/login/components/PasswordRequirements';
import { validatePassword } from '@/login/utils/passwordValidation';
import { setPasswordForCurrentUser } from '@/shared/auth/supabaseAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

const addPasswordSchema = z
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

type AddPasswordFormValues = z.infer<typeof addPasswordSchema>;

export default function AddLoginMethodPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AddPasswordFormValues>({
    resolver: zodResolver(addPasswordSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  const passwordValue = watch('password') ?? '';

  const onSubmit = async ({ password }: AddPasswordFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await setPasswordForCurrentUser(password);
      toast.success('비밀번호가 설정되었습니다. 이제 이메일로도 로그인할 수 있어요.', {
        position: 'bottom-center',
      });
      navigate(-1);
    } catch {
      setSubmitError('비밀번호 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-3 md:px-4'>
      <Card className='reading-shadow w-full max-w-md border-border/50'>
        <CardHeader>
          <CardTitle className='text-2xl font-semibold tracking-tight text-foreground'>
            비밀번호 추가
          </CardTitle>
          <p className='text-sm text-muted-foreground'>
            이메일과 비밀번호로도 로그인할 수 있어요.
          </p>
        </CardHeader>

        <CardContent>
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
              variant='cta'
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
                '비밀번호 설정'
              )}
            </Button>

            <Button
              variant='ghost'
              type='button'
              onClick={() => navigate(-1)}
              className='w-full text-muted-foreground'
            >
              취소
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
