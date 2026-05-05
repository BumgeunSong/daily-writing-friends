import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import FormField from '@/login/components/JoinFormField';
import { PasswordRequirements } from '@/login/components/PasswordRequirements';
import { validatePassword } from '@/login/utils/passwordValidation';
import { setPasswordForCurrentUser } from '@/shared/auth/supabaseAuth';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

const addLoginMethodSchema = z
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

type AddLoginMethodFormValues = z.infer<typeof addLoginMethodSchema>;

function CurrentMethodCard({
  email,
  name,
  photoURL,
}: {
  email: string;
  name: string | null;
  photoURL: string | null;
}) {
  return (
    <div className='rounded-lg border border-border/50 bg-muted/40 p-3'>
      <p className='mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
        지금 사용 중
      </p>
      <div className='flex items-center gap-3'>
        {photoURL ? (
          <img
            src={photoURL}
            alt=''
            className='size-10 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10'
          />
        ) : (
          <div className='flex size-10 items-center justify-center rounded-full bg-background ring-1 ring-inset ring-black/10 dark:ring-white/10'>
            <span className='text-sm font-medium text-foreground'>
              {(name ?? email).slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium text-foreground'>Google</p>
          <p className='truncate text-xs text-muted-foreground'>{email}</p>
        </div>
        <span className='flex shrink-0 items-center gap-1 text-xs text-green-600 dark:text-green-400'>
          <CheckCircle2 className='size-3.5' />
          연결됨
        </span>
      </div>
    </div>
  );
}

export default function AddLoginMethodPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AddLoginMethodFormValues>({
    resolver: zodResolver(addLoginMethodSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  const passwordValue = watch('password') ?? '';

  const onSubmit = async ({ password }: AddLoginMethodFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await setPasswordForCurrentUser(password);
      toast.success('이메일/비밀번호 로그인이 추가되었습니다.', {
        position: 'bottom-center',
      });
      navigate(-1);
    } catch {
      setSubmitError('저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const email = currentUser?.email ?? '';

  return (
    <div className='flex min-h-screen items-start justify-center bg-background px-3 py-6 md:px-4'>
      <Card className='reading-shadow w-full max-w-md border-border/50'>
        <CardHeader>
          <CardTitle className='text-2xl font-semibold tracking-tight text-foreground'>
            로그인 수단 추가
          </CardTitle>
          <p className='text-sm text-muted-foreground text-pretty'>
            같은 계정에 다른 로그인 방법을 연결할 수 있어요. 어디서 들어오든 같은 계정으로 접속됩니다.
          </p>
        </CardHeader>

        <CardContent className='space-y-5'>
          <CurrentMethodCard
            email={email}
            name={currentUser?.displayName ?? null}
            photoURL={currentUser?.photoURL ?? null}
          />

          <div className='space-y-3'>
            <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
              추가할 수 있는 방법
            </p>
            <div className='rounded-lg border border-border/50 bg-card p-4'>
              <div className='mb-3 flex items-center gap-2'>
                <Mail className='size-5 text-muted-foreground' />
                <span className='text-sm font-medium text-foreground'>
                  이메일/비밀번호
                </span>
              </div>

              {email && (
                <p className='mb-4 text-xs text-muted-foreground'>
                  <span className='font-medium text-foreground'>{email}</span>로
                  로그인할 수 있어요.
                </p>
              )}

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
                      추가 중...
                    </>
                  ) : (
                    '추가하기'
                  )}
                </Button>
              </form>
            </div>
          </div>

          <Button
            variant='ghost'
            type='button'
            onClick={() => navigate(-1)}
            className='w-full text-muted-foreground'
          >
            취소
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
