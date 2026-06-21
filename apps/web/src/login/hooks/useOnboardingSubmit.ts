import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { addUserToBoardWaitingList } from '@/board/utils/boardUtils';
import { getSubmitErrorMessage } from '@/login/utils/onboardingDerived';
import type { OnboardingFormSchema } from '@/login/utils/onboardingSchema';
import {
  getSubmitStepOrder,
  resolveOnboardingSubmit,
  type OnboardingSubmitAction,
  type SubmitStepKind,
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
}

const WAITLIST_FAILED_MESSAGE = '대기자 명단에 추가하는 중 오류가 발생했습니다.';
const SESSION_EXPIRED_MESSAGE = '로그인 상태가 만료되었습니다. 다시 로그인해주세요.';

async function joinWaitlist(action: OnboardingSubmitAction): Promise<void> {
  if (action.kind !== 'updateThenWaitlist') return;
  const wasAdded = await addUserToBoardWaitingList(action.boardId, action.uid);
  if (!wasAdded) throw new Error(WAITLIST_FAILED_MESSAGE);
}

async function runSubmitStep(
  step: SubmitStepKind,
  action: OnboardingSubmitAction,
  user: AuthUser,
): Promise<void> {
  switch (step) {
    case 'createUser':
      return createUserIfNotExists(user);
    case 'writeProfile':
      return updateUser(action.uid, action.profilePayload);
    case 'joinWaitlist':
      return joinWaitlist(action);
    case 'markComplete':
      return updateUser(action.uid, { onboardingComplete: true });
  }
}

/**
 * Wraps the onboarding submit pipeline. WHAT to write (`resolveOnboardingSubmit`)
 * and the ORDER to write it in (`getSubmitStepOrder`) are pure; this hook owns
 * the side effects and exposes `submitError` so the page renders it inline.
 */
export function useOnboardingSubmit({
  currentUser,
  upcomingBoardId,
  upcomingCohort,
  prefillError,
}: SubmitDeps): UseOnboardingSubmitResult {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const runWrites = useCallback(async (action: OnboardingSubmitAction, user: AuthUser) => {
    for (const step of getSubmitStepOrder(action)) {
      await runSubmitStep(step, action, user);
    }
  }, []);

  const onSubmit = useCallback(
    async (values: OnboardingFormSchema) => {
      if (!currentUser?.uid) {
        toast.error(SESSION_EXPIRED_MESSAGE);
        return;
      }
      if (prefillError) {
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
        if (action.kind === 'updateThenWaitlist') {
          navigate(action.navigateTo.path, { state: action.navigateTo.state });
        } else {
          navigate(action.navigateTo.path);
        }
      } catch (err) {
        console.error('useOnboardingSubmit error', err);
        setSubmitError(getSubmitErrorMessage(err));
      }
    },
    [currentUser, prefillError, upcomingBoardId, upcomingCohort, navigate, runWrites],
  );

  return { onSubmit, submitError };
}
