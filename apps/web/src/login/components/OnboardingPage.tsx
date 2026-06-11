import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, type FieldValues, type UseFormRegister } from 'react-hook-form';
import { useNavigate } from '@/shared/navigation';
import { useIsUserInWaitingList } from '@/login/hooks/useIsUserInWaitingList';
import { useOnboardingPrefill } from '@/login/hooks/useOnboardingPrefill';
import { useOnboardingSubmit } from '@/login/hooks/useOnboardingSubmit';
import { useUpcomingBoard } from '@/login/hooks/useUpcomingBoard';
import { ROUTES } from '@/login/constants';
import {
  getOnboardingHeader,
  getSubmitCtaLabel,
  isSubmitDisabled,
} from '@/login/utils/onboardingDerived';
import {
  ONBOARDING_FORM_DEFAULTS,
  onboardingSchema,
  type OnboardingFormSchema,
} from '@/login/utils/onboardingSchema';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import CohortConfirmCard from './CohortConfirmCard';
import FormField from './JoinFormField';
import FormHeader from './JoinFormHeader';

/**
 * Loading sequence (waterfall acknowledged in design.md D3):
 *   Stage 1: useAuth() resolves uid
 *   Stage 2: in parallel — useUpcomingBoard, useIsUserInWaitingList, fetchUser(uid)
 * The single skeleton covers both stages so callers see one loading surface, not two.
 */

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { data: upcomingBoard, isLoading: isBoardLoading } = useUpcomingBoard();
  const { isInWaitingList, isLoading: isWaitingLoading } = useIsUserInWaitingList();

  const [tab, setTab] = useState<'phone' | 'kakao'>('phone');
  const [hasAgreedToCohort, setHasAgreedToCohort] = useState(false);

  const form = useForm<OnboardingFormSchema>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: ONBOARDING_FORM_DEFAULTS,
  });
  const { register: typedRegister, handleSubmit, formState, setValue, watch } = form;
  // FormField is typed against FieldValues; widen the typed register to interop.
  const register = typedRegister as unknown as UseFormRegister<FieldValues>;
  const formValues = watch();

  const { isPrefilling, prefillError, initialContactTab } = useOnboardingPrefill(
    {
      uid: currentUser?.uid,
      displayName: currentUser?.displayName,
      authLoading,
    },
    form,
  );

  // Sync the tab UI with whatever the prefill picked. The form's
  // `activeContactTab` field is the source of truth; this just mirrors it for
  // the visible tab control state.
  useEffect(() => {
    setTab(initialContactTab);
  }, [initialContactTab]);

  // If already on the waiting list, skip onboarding entirely.
  useEffect(() => {
    if (!isWaitingLoading && isInWaitingList) {
      navigate(ROUTES.BOARDS, { replace: true });
    }
  }, [isInWaitingList, isWaitingLoading, navigate]);

  const isLoading = authLoading || isBoardLoading || isWaitingLoading || isPrefilling;
  const requiresCohortAgreement = Boolean(upcomingBoard?.cohort);

  const { onSubmit, submitError } = useOnboardingSubmit({
    currentUser,
    upcomingBoardId: upcomingBoard?.id ?? null,
    upcomingCohort: upcomingBoard?.cohort ?? null,
    prefillError,
  });

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

  const { title: headerTitle, subtitle: headerSubtitle } = getOnboardingHeader(upcomingBoard);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 lg:max-w-4xl">
        <FormHeader title={headerTitle} subtitle={headerSubtitle} />

        {requiresCohortAgreement && upcomingBoard && (
          <div className="mb-4">
            <CohortConfirmCard
              upcomingBoard={upcomingBoard}
              agreed={hasAgreedToCohort}
              onAgreedChange={setHasAgreedToCohort}
            />
          </div>
        )}

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
                  매글프 단체 카톡방이 만들어져요. 카톡방에 초대하기 위해 필요한 정보예요.
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
            disabled={isSubmitDisabled({
              isSubmitting: formState.isSubmitting,
              hasPrefillError: prefillError !== null,
              requiresCohortAgreement,
              hasAgreedToCohort,
            })}
          >
            {getSubmitCtaLabel({
              isSubmitting: formState.isSubmitting,
              hasCohort: Boolean(upcomingBoard?.cohort),
            })}
          </Button>
        </div>
      </div>
      {/* Hidden value sentinel to keep form values from being garbage-collected by linters */}
      <span className="sr-only" aria-hidden="true">{`${formValues.activeContactTab}`}</span>
    </div>
  );
}
