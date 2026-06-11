import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, type FieldValues, type UseFormRegister } from 'react-hook-form';
// `tab` is read from `formValues.activeContactTab` (single source of truth) —
// no local mirror state, to avoid a one-frame flicker when prefill resolves to
// 'kakao' for a returning user.
import { useNavigate } from '@/shared/navigation';
import { useIsUserInWaitingList } from '@/login/hooks/useIsUserInWaitingList';
import { useOnboardingPrefill } from '@/login/hooks/useOnboardingPrefill';
import { useOnboardingSubmit } from '@/login/hooks/useOnboardingSubmit';
import { useUpcomingBoard } from '@/login/hooks/useUpcomingBoard';
import { ROUTES } from '@/login/constants';
import { getOnboardingHeader } from '@/login/utils/onboardingDerived';
import {
  ONBOARDING_FORM_DEFAULTS,
  onboardingSchema,
  type OnboardingFormSchema,
} from '@/login/utils/onboardingSchema';
import { useAuth } from '@/shared/hooks/useAuth';
import { Card, CardContent } from '@/shared/ui/card';
import CohortConfirmCard from './CohortConfirmCard';
import FormHeader from './JoinFormHeader';
import OnboardingFormFields from './OnboardingFormFields';
import OnboardingLoadingSkeleton from './OnboardingLoadingSkeleton';
import OnboardingSubmitBar from './OnboardingSubmitBar';

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

  const [hasAgreedToCohort, setHasAgreedToCohort] = useState(false);

  const form = useForm<OnboardingFormSchema>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: ONBOARDING_FORM_DEFAULTS,
  });
  const { register: typedRegister, handleSubmit, formState, setValue, watch } = form;
  // FormField is typed against FieldValues; widen the typed register to interop.
  const register = typedRegister as unknown as UseFormRegister<FieldValues>;
  const formValues = watch();
  const tab = formValues.activeContactTab;

  const { isPrefilling, prefillError } = useOnboardingPrefill(
    { uid: currentUser?.uid, displayName: currentUser?.displayName, authLoading },
    form,
  );

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
    setValue('activeContactTab', next, { shouldValidate: true });
  };

  if (isLoading) return <OnboardingLoadingSkeleton />;

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
              <OnboardingFormFields
                tab={tab}
                onTabChange={switchTab}
                register={register}
                typedRegister={typedRegister}
                errors={formState.errors}
                prefillError={prefillError}
                submitError={submitError}
              />
            </form>
          </CardContent>
        </Card>
      </div>

      <OnboardingSubmitBar
        isSubmitting={formState.isSubmitting}
        hasPrefillError={prefillError !== null}
        requiresCohortAgreement={requiresCohortAgreement}
        hasAgreedToCohort={hasAgreedToCohort}
        hasCohort={Boolean(upcomingBoard?.cohort)}
      />

      {/* Hidden value sentinel to keep form values from being garbage-collected by linters */}
      <span className="sr-only" aria-hidden="true">{`${formValues.activeContactTab}`}</span>
    </div>
  );
}
