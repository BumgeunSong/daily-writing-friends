import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import FormField from '@/login/components/JoinFormField';
import { PasswordRequirements } from '@/login/components/PasswordRequirements';
import { ROUTES } from '@/login/constants';
import { validatePassword } from '@/login/utils/passwordValidation';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { mapSetPasswordErrorToKorean } from '@/shared/auth/authErrors';
import {
  sendPasswordResetEmail,
  setPasswordForCurrentUser,
} from '@/shared/auth/supabaseAuth';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { useEmailIdentityStatus } from '@/user/hooks/useHasPasswordIdentity';

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

function ConnectedBadge() {
  return (
    <span className='flex shrink-0 items-center gap-1 text-xs text-green-600 dark:text-green-400'>
      <CheckCircle2 className='size-3.5' />
      연결됨
    </span>
  );
}

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
        <ConnectedBadge />
      </div>
    </div>
  );
}

function ConnectedEmailCard({
  email,
  onChangePassword,
}: {
  email: string;
  onChangePassword: () => void;
}) {
  return (
    <div className='rounded-lg border border-border/50 bg-card p-4'>
      <div className='flex items-center gap-3'>
        <Mail className='size-5 shrink-0 text-muted-foreground' />
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium text-foreground'>이메일/비밀번호</p>
          {email && (
            <p className='truncate text-xs text-muted-foreground'>{email}</p>
          )}
        </div>
        <ConnectedBadge />
      </div>
      <div className='mt-3 flex justify-end'>
        <Button
          variant='ghost'
          size='sm'
          onClick={onChangePassword}
          className='-mr-2 h-9 text-ring hover:text-ring'
        >
          비밀번호 변경
          <ChevronRight className='ml-1 size-4' />
        </Button>
      </div>
    </div>
  );
}

function AddEmailMethodForm({
  email,
  onSuccess,
}: {
  email: string;
  onSuccess: () => Promise<void>;
}) {
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
      await onSuccess();
    } catch (err) {
      setSubmitError(mapSetPasswordErrorToKorean(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='rounded-lg border border-border/50 bg-card p-4'>
      <div className='mb-3 flex items-center gap-2'>
        <Mail className='size-5 text-muted-foreground' />
        <span className='text-sm font-medium text-foreground'>이메일/비밀번호</span>
      </div>

      {email && (
        <p className='mb-4 text-xs text-muted-foreground'>
          <span className='font-medium text-foreground'>{email}</span>로 로그인할 수 있어요.
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

        {submitError && <p className='text-sm text-destructive'>{submitError}</p>}

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
  );
}

function UnverifiedEmailCard({ email }: { email: string }) {
  const [isSending, setIsSending] = useState(false);

  // Why sendPasswordResetEmail instead of auth.resend({type:'signup'}):
  // For OAuth users whose user.email_confirmed_at is already set, Supabase's
  // resend silently no-ops (returns 200 with {}). The reset-password magic
  // link works for any user, marks the email identity as verified upon use,
  // and lands them on /set-password to confirm their password.
  const handleSend = async () => {
    if (!email) return;
    try {
      setIsSending(true);
      await sendPasswordResetEmail(email);
      toast.success('인증 메일을 보냈어요. 메일에서 링크를 눌러 비밀번호를 다시 설정해주세요.', {
        position: 'bottom-center',
      });
    } catch {
      toast.error('인증 메일 발송에 실패했어요. 잠시 후 다시 시도해주세요.', {
        position: 'bottom-center',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className='rounded-lg border border-border/50 bg-card p-4'>
      <div className='flex items-start gap-3'>
        <Mail className='mt-0.5 size-5 shrink-0 text-muted-foreground' />
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium text-foreground'>이메일/비밀번호</p>
          {email && (
            <p className='truncate text-xs text-muted-foreground'>{email}</p>
          )}
          <p className='mt-2 flex items-start gap-1 text-xs text-amber-600 dark:text-amber-400 text-pretty'>
            <AlertTriangle className='mt-0.5 size-3.5 shrink-0' />
            <span>
              비밀번호 추가가 마무리되지 않았어요. 보내드린 메일에서 링크를 눌러 비밀번호를
              확정해주세요.
            </span>
          </p>
        </div>
      </div>
      <div className='mt-3 flex justify-end'>
        <Button
          variant='outline'
          size='sm'
          onClick={handleSend}
          disabled={isSending || !email}
          className='h-9'
        >
          {isSending ? (
            <>
              <Loader2 className='mr-2 size-3.5 animate-spin' />
              보내는 중...
            </>
          ) : (
            '인증 메일 받기'
          )}
        </Button>
      </div>
    </div>
  );
}

function MethodSectionSkeleton() {
  return (
    <div className='space-y-3'>
      <div className='h-3 w-32 rounded bg-muted/60' />
      <div className='h-24 rounded-lg border border-border/50 bg-muted/30' />
    </div>
  );
}

export default function AddLoginMethodPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const status = useEmailIdentityStatus();

  const email = currentUser?.email ?? '';
  const goToSettings = () => navigate(ROUTES.USER_SETTINGS);

  const handleAddSuccess = async () => {
    // Force the JWT to refresh so the freshly created email identity is
    // visible to the next `auth.getUser()` call (the Settings row depends on it).
    await getSupabaseClient().auth.refreshSession().catch(() => {
      // Even if refresh fails, the identity is server-side; the row will
      // catch up on the next mount.
    });
    toast.success('이메일/비밀번호 로그인이 추가되었습니다.', {
      position: 'bottom-center',
    });
    navigate(ROUTES.USER_SETTINGS);
  };

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

          {status === null && <MethodSectionSkeleton />}

          {status === 'verified' && (
            <div className='space-y-3'>
              <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                추가된 방법
              </p>
              <ConnectedEmailCard
                email={email}
                onChangePassword={() => navigate(ROUTES.CHANGE_PASSWORD)}
              />
            </div>
          )}

          {status === 'unverified' && (
            <div className='space-y-3'>
              <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                인증 대기 중
              </p>
              <UnverifiedEmailCard email={email} />
            </div>
          )}

          {status === 'none' && (
            <div className='space-y-3'>
              <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                추가할 수 있는 방법
              </p>
              <AddEmailMethodForm email={email} onSuccess={handleAddSuccess} />
            </div>
          )}

          <Button
            variant='ghost'
            type='button'
            onClick={goToSettings}
            className='w-full text-muted-foreground'
          >
            {status === 'none' ? '취소' : '돌아가기'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
