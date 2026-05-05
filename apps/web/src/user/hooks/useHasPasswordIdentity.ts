import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

/**
 * Returns whether the current user has an email/password identity.
 * - `null` while loading or when there is no user
 * - `true` when the user has at least one `provider: 'email'` identity
 * - `false` otherwise (e.g. Google-only)
 */
export function useHasPasswordIdentity(): boolean | null {
  const { currentUser } = useAuth();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setHasPassword(null);
      return;
    }
    // Reset to loading state immediately so a stale value from a previous user
    // is never visible while the new request is in flight.
    setHasPassword(null);
    let cancelled = false;
    getSupabaseClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return;
        const identities = data.user?.identities ?? [];
        setHasPassword(identities.some((i) => i.provider === 'email'));
      })
      .catch(() => {
        if (!cancelled) setHasPassword(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  return hasPassword;
}
