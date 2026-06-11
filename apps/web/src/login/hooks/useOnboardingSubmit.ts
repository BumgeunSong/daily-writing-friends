import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { addUserToBoardWaitingList } from '@/board/utils/boardUtils';
import {
  getNavigateArgs,
  getSubmitErrorMessage,
} from '@/login/utils/onboardingDerived';
import type { OnboardingFormSchema } from '@/login/utils/onboardingSchema';
import {
  resolveOnboardingSubmit,
  type OnboardingSubmitAction,
} from '@/login/utils/onboardingSubmit';
import type { AuthUser } from '@/shared/hooks/useAuth';
import { useNavigate } from '@/shared/navigation';
import { createUserIfNotExists, updateUser } from '@/user/api/user';

interface SubmitDeps {
  currentUser: AuthUser | null;
  upcomingBoardId: string | null;
  upcomingCohort: number | null;
  prefillError: string | null;
}

export interface UseOnboardingSubmitResult {
  onSubmit: (values: OnboardingFormSchema) => Promise<void>;
  submitError: string | null;
  resetSubmitError: () => void;
}

/**
 * Wraps the onboarding submit pipeline. The decision of WHAT to write is pure
 * (`resolveOnboardingSubmit` / `getNavigateArgs`); this hook owns the side
 * effects: createUserIfNotExists → updateUser → (waitlist if cohort) → flip
 * onboardingComplete → navigate. Submit error is exposed as state so the page
 * can render it inline.
 */
export function useOnboardingSubmit({
  currentUser,
  upcomingBoardId,
  upcomingCohort,
  prefillError,
}: SubmitDeps): UseOnboardingSubmitResult {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const runWrites = useCallback(
    async (action: OnboardingSubmitAction, user: AuthUser) => {
      // Write order is deliberate: profile fields first WITHOUT onboardingComplete,
      // then waitlist (if any), then a final flip of onboardingComplete=true.
      // If the process crashes between steps, the user lands back on /join/onboarding
      // (because the flag is still false) and re-submitting is idempotent for both
      // the profile update and the waitlist upsert.
      await createUserIfNotExists(user);
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
    },
    [],
  );

  const onSubmit = useCallback(
    async (values: OnboardingFormSchema) => {
      if (!currentUser?.uid) {
        toast.error('로그인 상태가 만료되었습니다. 다시 로그인해주세요.');
        return;
      }
      if (prefillError) {
        // Defensive: submit should already be disabled in this state. If it
        // fires anyway, refuse to write rather than silently overwrite.
        setSubmitError(prefillError);
        return;
      }
      setSubmitError(null);

      const action = resolveOnboardingSubmit(values, {
        uid: currentUser.uid,
        upcomingBoardId,
        upcomingCohort,
      });

      try {
        await runWrites(action, currentUser);
        const nav = getNavigateArgs(action);
        navigate(nav.path, nav.options as { state: unknown } | undefined);
      } catch (err) {
        console.error('OnboardingPage submit error', err);
        setSubmitError(getSubmitErrorMessage(err));
      }
    },
    [currentUser, prefillError, upcomingBoardId, upcomingCohort, navigate, runWrites],
  );

  return {
    onSubmit,
    submitError,
    resetSubmitError: useCallback(() => setSubmitError(null), []),
  };
}
