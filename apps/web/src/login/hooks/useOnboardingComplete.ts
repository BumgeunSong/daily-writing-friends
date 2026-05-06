import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/shared/api/supabaseClient';

/**
 * Reads the boolean `users.onboarding_complete` flag for the given uid.
 * Narrow select avoids paying for the full user payload during root-redirect routing.
 * Returns `false` while loading, while no uid, or on error — RootRedirect treats false
 * as "send to /join/onboarding," which is the safe default.
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
      if (error || !row) return false;
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
