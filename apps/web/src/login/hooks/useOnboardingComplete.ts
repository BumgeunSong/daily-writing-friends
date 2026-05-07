import * as Sentry from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/shared/api/supabaseClient';

/**
 * Reads the boolean `users.onboarding_complete` flag for the given uid.
 * Narrow select avoids paying for the full user payload during root-redirect routing.
 *
 * Error contract: returns `false` while loading, while no uid, or on error.
 * `RootRedirect` treats `false` as "send to /join/onboarding," which is the safe
 * default — the user re-enters onboarding and the form pre-fills from `fetchUser`,
 * so a transient outage does not silently land them on `/boards` with an empty
 * profile. Errors are reported to Sentry via `captureException` and also logged
 * to the console; both are needed because React Query's global onError handler
 * does not fire when the queryFn handles the error itself.
 */
export function useOnboardingComplete(uid: string | null | undefined): {
  onboardingComplete: boolean;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ['onboardingComplete', uid],
    queryFn: async () => {
      if (!uid) return false;
      const supabase = getSupabaseClient();
      const { data: row, error } = await supabase
        .from('users')
        .select('onboarding_complete')
        .eq('id', uid)
        .maybeSingle();
      if (error) {
        console.error('useOnboardingComplete fetch error', { uid, error });
        Sentry.captureException(error, {
          tags: { hook: 'useOnboardingComplete' },
          extra: { uid },
        });
        return false;
      }
      if (!row) return false;
      return Boolean(row.onboarding_complete);
    },
    enabled: !!uid,
    staleTime: 1000 * 60,
  });

  return {
    onboardingComplete: data ?? false,
    isLoading: isLoading && !!uid,
  };
}
