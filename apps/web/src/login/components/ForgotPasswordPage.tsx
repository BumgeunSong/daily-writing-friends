import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ROUTES } from '@/login/constants';
import { sendPasswordResetEmail } from '@/shared/auth/supabaseAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import FormField from './JoinFormField';

const forgotSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: ForgotFormValues) => {
    try {
      setIsSubmitting(true);
      await sendPasswordResetEmail(email);
    } catch {
      // Always show success — don't disclose whether email exists
    } finally {
      setIsSubmitting(false);
      setIsSent(true);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-3 md:px-4'>
      <Card className='reading-shadow w-full max-w-md border-border/50'>
        <CardHeader>
          <CardTitle className='text-2xl font-semibold tracking-tight text-foreground'>
            비밀번호 찾기
          </CardTitle>
          <p className='text-sm text-muted-foreground'>
            가입한 이메일로 재설정 링크를 보내드려요.
          </p>
        </CardHeader>

        <CardContent>
          {isSent ? (
            <div className='space-y-3'>
              <p className='text-sm text-foreground text-pretty'>
                비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해주세요.
              </p>
              <p className='text-xs text-muted-foreground'>스팸 메일함도 확인해보세요.</p>
            </div>
          ) : (
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

              <Button
                variant='default'
                type='submit'
                disabled={isSubmitting}
                className='min-h-[44px] w-full'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 size-4 animate-spin' />
                    메일 보내는 중...
                  </>
                ) : (
                  '재설정 메일 받기'
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
