import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/login/constants';
import { useIsCurrentUserActive } from '@/login/hooks/useIsCurrentUserActive';
import { useIsUserInWaitingList } from '@/login/hooks/useIsUserInWaitingList';
import { useOnboardingComplete } from '@/login/hooks/useOnboardingComplete';
import { useAuth } from '@/shared/hooks/useAuth';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * `/join/form` is the universal "start cohort signup" entry point.
 * The dispatcher routes the user to the correct destination based on their state.
 */
export function JoinDispatcher() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { isCurrentUserActive, isLoading: activeLoading } = useIsCurrentUserActive();
  const { isInWaitingList, isLoading: waitingLoading } = useIsUserInWaitingList();
  const { onboardingComplete, isLoading: onboardingLoading } = useOnboardingComplete(currentUser?.uid);

  const isLoading = activeLoading || waitingLoading || onboardingLoading;

  useEffect(() => {
    if (!currentUser || isLoading) return;
    if (isCurrentUserActive) {
      navigate('/join/form/active-user', { replace: true });
      return;
    }
    if (isInWaitingList) {
      navigate(ROUTES.BOARDS, { replace: true });
      return;
    }
    if (!onboardingComplete) {
      navigate(ROUTES.ONBOARDING, { replace: true });
      return;
    }
    navigate(ROUTES.ONBOARDING, { replace: true });
  }, [currentUser, isLoading, isCurrentUserActive, isInWaitingList, onboardingComplete, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 lg:max-w-4xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="space-y-6 rounded-lg border border-border bg-card p-6">
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
