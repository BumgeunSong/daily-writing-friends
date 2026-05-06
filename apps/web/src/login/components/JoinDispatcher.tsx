import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/login/constants';
import { useIsCurrentUserActive } from '@/login/hooks/useIsCurrentUserActive';
import { useIsUserInWaitingList } from '@/login/hooks/useIsUserInWaitingList';
import { useAuth } from '@/shared/hooks/useAuth';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * `/join/form` is the universal "start cohort signup" entry point.
 *
 * Routing per design D8 (and matching spec scenarios):
 *   active                        → /join/form/active-user
 *   in waiting list               → /boards
 *   anyone else                   → /join/onboarding
 *
 * "Anyone else" intentionally collapses two cases — first-time onboarding and
 * re-apply for the next cohort — onto the same destination. OnboardingPage
 * pre-fills profile fields and shows the cohort signup card, so it serves both.
 *
 * `useOnboardingComplete` was previously read here and not branched on; it is
 * dropped to avoid an extra network round-trip and a delayed routing decision.
 * If that branch is ever needed, re-add the hook and split the destination.
 */
export function JoinDispatcher() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { isCurrentUserActive, isLoading: activeLoading } = useIsCurrentUserActive();
  const { isInWaitingList, isLoading: waitingLoading } = useIsUserInWaitingList();

  const isLoading = activeLoading || waitingLoading;

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
    navigate(ROUTES.ONBOARDING, { replace: true });
  }, [currentUser, isLoading, isCurrentUserActive, isInWaitingList, navigate]);

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
