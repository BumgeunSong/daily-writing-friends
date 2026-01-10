import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsCurrentUserActive } from '@/login/hooks/useIsCurrentUserActive';
import { useAuth } from '@/shared/hooks/useAuth';
import { Skeleton } from '@/shared/ui/skeleton';

export function JoinFormPageForActiveOrNewUser() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { isCurrentUserActive, isLoading } = useIsCurrentUserActive();

  useEffect(() => {
    if (currentUser && !isLoading) {
      navigate(isCurrentUserActive ? '/join/form/active-user' : '/join/form/new-user', { replace: true });
    }
  }, [currentUser, isCurrentUserActive, isLoading, navigate]);

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