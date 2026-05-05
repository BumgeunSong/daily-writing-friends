import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

interface SupabaseIdentity {
  provider?: string;
  identity_data?: Record<string, unknown> | null;
}

/**
 * Pure check: does this user have a working email/password identity?
 *
 * Why both checks are required: Supabase persists an `email` provider row
 * after `signUp({email, password})` even before the user clicks the
 * verification link. An unverified email identity cannot be used to log in
 * (`signInWithPassword` returns "Email not confirmed"), so for UX purposes
 * the user does NOT yet have a usable password.
 */
export function hasUsablePasswordIdentity(identities: SupabaseIdentity[]): boolean {
  return identities.some(
    (i) => i.provider === 'email' && i.identity_data?.email_verified === true,
  );
}

/**
 * Returns whether the current user has a usable email/password identity.
 * - `null` while loading or when there is no user
 * - `true` when the user has a verified `provider: 'email'` identity
 * - `false` otherwise (Google-only, or an unconfirmed email-signup attempt)
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
        setHasPassword(hasUsablePasswordIdentity(data.user?.identities ?? []));
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
