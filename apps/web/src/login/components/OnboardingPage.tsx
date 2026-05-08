import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import type { FieldValues, UseFormRegister } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { addUserToBoardWaitingList } from '@/board/utils/boardUtils';
import { useIsUserInWaitingList } from '@/login/hooks/useIsUserInWaitingList';
import { useUpcomingBoard } from '@/login/hooks/useUpcomingBoard';
import { ROUTES } from '@/login/constants';
import { validateKakaoId, validatePhone } from '@/login/utils/contactValidation';
import { resolveOnboardingSubmit } from '@/login/utils/onboardingSubmit';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { fetchUser, updateUser, createUserIfNotExists } from '@/user/api/user';
import FormField from './JoinFormField';
import FormHeader from './JoinFormHeader';

/**
 * Loading sequence (waterfall acknowledged in design.md D3):
 *   Stage 1: useAuth() resolves uid
 *   Stage 2: in parallel — useUpcomingBoard, useIsUserInWaitingList, fetchUser(uid)
 * The single skeleton covers both stages so callers see one loading surface, not two.
 */
const onboardingSchema = z
  .object({
    realName: z.string().trim().min(2, '이름은 2글자 이상이어야 합니다.'),
    nickname: z.string().trim().min(1, '필명을 입력해주세요.'),
    phone: z.string(),
    kakaoId: z.string(),
    referrer: z.string(),
    activeContactTab: z.enum(['phone', 'kakao']),
  })
  .superRefine((v, ctx) => {
    const ok =
      v.activeContactTab === 'phone'
        ? validatePhone(v.phone) !== null
        : validateKakaoId(v.kakaoId) !== null;
    if (ok) return;
    ctx.addIssue({
      code: 'custom',
      message: '연락처를 입력해주세요.',
      // Error attaches to the visible field so the user actually sees it.
      path: [v.activeContactTab === 'phone' ? 'phone' : 'kakaoId'],
    });
  });

type OnboardingFormSchema = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { data: upcomingBoard, isLoading: isBoardLoading } = useUpcomingBoard();
  const { isInWaitingList, isLoading: isWaitingLoading } = useIsUserInWaitingList();

  const [tab, setTab] = useState<'phone' | 'kakao'>('phone');
  const [isPrefilling, setIsPrefilling] = useState(true);
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<OnboardingFormSchema>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      realName: '',
      nickname: '',
      phone: '',
      kakaoId: '',
      referrer: '',
      activeContactTab: 'phone',
    },
  });
  const { register: typedRegister, handleSubmit, formState, setValue, reset, watch } = form;
  // FormField is typed against FieldValues; widen the typed register to interop.
  const register = typedRegister as unknown as UseFormRegister<FieldValues>;
  const formValues = watch();

  // Pre-fill from existing profile if any. If fetchUser fails, surface the error
  // and BLOCK submit (see `submitDisabled` below) so a transient outage cannot
  // overwrite real profile data with the blank form's defaults.
  useEffect(() => {
    if (!currentUser?.uid || authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await fetchUser(currentUser.uid);
        if (cancelled) return;
        if (existing) {
          const initialTab: 'phone' | 'kakao' = existing.kakaoId && !existing.phoneNumber ? 'kakao' : 'phone';
          reset({
            realName: existing.realName ?? '',
            nickname: existing.nickname ?? currentUser.displayName ?? '',
            phone: existing.phoneNumber ?? '',
            kakaoId: existing.kakaoId ?? '',
            referrer: existing.referrer ?? '',
            activeContactTab: initialTab,
          });
          setTab(initialTab);
        } else {
          // First-time user — seed nickname from auth displayName if available.
          if (currentUser.displayName) {
            setValue('nickname', currentUser.displayName);
          }
        }
        setPrefillError(null);
      } catch (err) {
        if (cancelled) return;
        console.error('OnboardingPage prefill error', err);
        setPrefillError(
          '기존 정보를 불러오지 못했어요. 새로고침 후 다시 시도해주세요. 그대로 제출하면 기존 정보가 덮어쓰일 수 있어요.',
        );
      } finally {
        if (!cancelled) setIsPrefilling(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, currentUser?.displayName, authLoading, reset, setValue]);

  // If already on the waiting list, skip onboarding entirely.
  useEffect(() => {
    if (!isWaitingLoading && isInWaitingList) {
      navigate(ROUTES.BOARDS, { replace: true });
    }
  }, [isInWaitingList, isWaitingLoading, navigate]);

  const isLoading = authLoading || isBoardLoading || isWaitingLoading || isPrefilling;

  const cohortLabel = useMemo(() => {
    if (!upcomingBoard?.cohort) return null;
    const firstDay = upcomingBoard.firstDay?.toDate();
    const startCopy = firstDay
      ? firstDay.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
      : null;
    return startCopy
      ? `${upcomingBoard.cohort}기 — ${startCopy}에 시작합니다.`
      : `${upcomingBoard.cohort}기에 자동으로 신청돼요.`;
  }, [upcomingBoard?.cohort, upcomingBoard?.firstDay]);

  const onSubmit = async (values: OnboardingFormSchema) => {
    if (!currentUser?.uid) {
      toast.error('로그인 상태가 만료되었습니다. 다시 로그인해주세요.');
      return;
    }
    if (prefillError) {
      // Defensive: should be unreachable because submit is disabled, but if it
      // somehow fires, refuse to write rather than silently overwrite.
      setSubmitError(prefillError);
      return;
    }
    setSubmitError(null);
    const action = resolveOnboardingSubmit(values, {
      uid: currentUser.uid,
      upcomingBoardId: upcomingBoard?.id ?? null,
      upcomingCohort: upcomingBoard?.cohort ?? null,
    });
    try {
      // Write order is deliberate: profile fields first WITHOUT onboardingComplete,
      // then waitlist (if any), then a final flip of onboardingComplete=true.
      // If the process crashes between steps, the user lands back on /join/onboarding
      // (because the flag is still false) and re-submitting is idempotent for both
      // the profile update and the waitlist upsert.
      await createUserIfNotExists(currentUser);
      await updateUser(action.uid, {
        realName: action.profilePayload.real_name ?? null,
        nickname: action.profilePayload.nickname ?? null,
        phoneNumber: action.profilePayload.phone_number ?? null,
        kakaoId: action.profilePayload.kakao_id ?? null,
        referrer: action.profilePayload.referrer ?? null,
      });
      if (action.kind === 'updateThenWaitlist') {
        const ok = await addUserToBoardWaitingList(action.boardId, action.uid);
        if (!ok) throw new Error('대기자 명단에 추가하는 중 오류가 발생했습니다.');
      }
      // Only after profile + waitlist succeed do we flip the flag. If this final
      // updateUser fails, the next routing pass sends the user back here and
      // re-submitting completes the flip; no orphaned `onboarding_complete=true`
      // row can exist without the corresponding waitlist signal.
      await updateUser(action.uid, { onboardingComplete: true });
      if (action.kind === 'updateThenWaitlist') {
        navigate(action.navigateTo.path, { state: action.navigateTo.state });
      } else {
        navigate(action.navigateTo.path);
      }
    } catch (err) {
      console.error('OnboardingPage submit error', err);
      const message = err instanceof Error ? err.message : '신청에 실패했습니다. 잠시 후 다시 시도해주세요.';
      setSubmitError(message);
    }
  };

  const switchTab = (next: 'phone' | 'kakao') => {
    setTab(next);
    setValue('activeContactTab', next, { shouldValidate: true });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 lg:max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-48" />
            <div className="space-y-4 rounded-lg border border-border bg-card p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const headerTitle = upcomingBoard?.cohort
    ? `매글프 ${upcomingBoard.cohort}기 신청하기`
    : '프로필을 입력해주세요';
  const headerSubtitle = upcomingBoard?.firstDay
    ? `${upcomingBoard.firstDay.toDate().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}에 시작합니다.`
    : '아래 정보를 채우면 다음 기수가 열릴 때 안내드려요.';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 lg:max-w-4xl">
        <FormHeader title={headerTitle} subtitle={headerSubtitle} />

        <Card className="bg-card">
          <CardContent className="p-6">
            <form id="onboarding-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                id="realName"
                label="이름"
                type="text"
                inputMode="text"
                placeholder="이름을 입력해주세요"
                register={register}
                error={formState.errors.realName}
              />

              <FormField
                id="nickname"
                label="필명"
                type="text"
                inputMode="text"
                placeholder="매글프에서 사용할 이름"
                register={register}
                error={formState.errors.nickname}
              />

              <div className="space-y-2">
                <span className="block text-sm font-medium lg:text-base">연락처</span>
                <div
                  role="tablist"
                  aria-label="연락처 입력 방식 선택"
                  className="inline-flex rounded-md border border-border bg-muted p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'phone'}
                    onClick={() => switchTab('phone')}
                    className={`rounded-sm px-3 py-1.5 text-sm transition-colors ${
                      tab === 'phone'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    전화번호
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'kakao'}
                    onClick={() => switchTab('kakao')}
                    className={`rounded-sm px-3 py-1.5 text-sm transition-colors ${
                      tab === 'kakao'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    카카오 ID
                  </button>
                </div>

                <input type="hidden" {...typedRegister('activeContactTab')} value={tab} />

                {tab === 'phone' ? (
                  <FormField
                    id="phone"
                    label="전화번호"
                    labelClassName="sr-only"
                    type="tel"
                    inputMode="numeric"
                    placeholder="ex. 01012345678"
                    register={register}
                    error={formState.errors.phone}
                  />
                ) : (
                  <FormField
                    id="kakaoId"
                    label="카카오 ID"
                    labelClassName="sr-only"
                    type="text"
                    inputMode="text"
                    placeholder="카카오톡 ID"
                    register={register}
                    error={formState.errors.kakaoId}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  하나만 입력해주세요. 시작 하루 전 안내에 사용해요.
                </p>
              </div>

              <FormField
                id="referrer"
                label="추천인"
                type="text"
                inputMode="text"
                placeholder="매글프를 소개해준 지인 이름 (선택)"
                register={register}
                error={formState.errors.referrer}
                optional
              />

              {cohortLabel && (
                <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">기수 신청</p>
                  <p className="mt-1">{cohortLabel}</p>
                </div>
              )}

              {prefillError && (
                <p className="text-sm text-destructive" role="alert">{prefillError}</p>
              )}
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="sticky inset-x-0 bottom-0 border-t border-border bg-background p-4">
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          <Button
            variant="cta"
            type="submit"
            form="onboarding-form"
            className="w-full"
            size="lg"
            disabled={formState.isSubmitting || prefillError !== null}
          >
            {formState.isSubmitting ? '신청 중...' : upcomingBoard?.cohort ? '신청하기' : '저장하기'}
          </Button>
        </div>
      </div>
      {/* Hidden value sentinel to keep form values from being garbage-collected by linters */}
      <span className="sr-only" aria-hidden="true">{`${formValues.activeContactTab}`}</span>
    </div>
  );
}
