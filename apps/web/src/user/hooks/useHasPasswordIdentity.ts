import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

interface SupabaseIdentity {
  provider?: string;
  identity_data?: Record<string, unknown> | null;
}

export type EmailIdentityStatus = 'verified' | 'unverified' | 'none';

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
  return getEmailIdentityStatus(identities) === 'verified';
}

/**
 * Pure status of the user's email/password identity.
 * - `'none'` — no email identity at all (Google-only or never tried email)
 * - `'unverified'` — email identity exists but `email_verified !== true`
 *   (signup attempt with no verification, OR password set on an unverified user)
 * - `'verified'` — email identity exists with `email_verified === true`
 *   (only this state allows signInWithPassword to succeed)
 */
export function getEmailIdentityStatus(
  identities: SupabaseIdentity[],
): EmailIdentityStatus {
  const emailIdentity = identities.find((i) => i.provider === 'email');
  if (!emailIdentity) return 'none';
  if (emailIdentity.identity_data?.email_verified === true) return 'verified';
  return 'unverified';
}

/**
 * Returns the current user's email-identity status, or `null` while loading.
 */
export function useEmailIdentityStatus(): EmailIdentityStatus | null {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<EmailIdentityStatus | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setStatus(null);
      return;
    }
    setStatus(null);
    let cancelled = false;
    getSupabaseClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return;
        setStatus(getEmailIdentityStatus(data.user?.identities ?? []));
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  return status;
}

/**
 * Backward-compatible boolean wrapper. Prefer `useEmailIdentityStatus`
 * when the caller needs to distinguish 'unverified' from 'none'.
 */
export function useHasPasswordIdentity(): boolean | null {
  const status = useEmailIdentityStatus();
  if (status === null) return null;
  return status === 'verified';
}
