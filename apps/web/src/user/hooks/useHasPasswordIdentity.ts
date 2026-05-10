import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

interface SupabaseIdentity {
  provider?: string;
  identity_data?: Record<string, unknown> | null;
}

interface SupabaseUserLike {
  email_confirmed_at?: string | null;
  identities?: SupabaseIdentity[] | null;
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
export function hasUsablePasswordIdentity(user: SupabaseUserLike | null): boolean {
  return getEmailIdentityStatus(user) === 'verified';
}

/**
 * Pure status of the user's email/password identity.
 * - `'none'` — no email identity at all (Google-only or never tried email)
 * - `'unverified'` — email identity exists but the email is not confirmed
 *   anywhere (no `identity_data.email_verified` and no user-level
 *   `email_confirmed_at` — i.e. a dangling `signUp` attempt that never
 *   completed OTP)
 * - `'verified'` — email identity exists and either the per-identity flag
 *   `email_verified === true` (set by `verifyOtp({type:'signup'})`) OR the
 *   user-level `email_confirmed_at` is populated. The user-level timestamp
 *   is the canonical signal `signInWithPassword` checks; an OAuth-linked
 *   user who added a password and then went through `resetPasswordForEmail`
 *   keeps `identity_data.email_verified: false` but has a usable password
 *   because `email_confirmed_at` is set.
 */
export function getEmailIdentityStatus(
  user: SupabaseUserLike | null,
): EmailIdentityStatus {
  const identities = user?.identities ?? [];
  const emailIdentity = identities.find((i) => i.provider === 'email');
  if (!emailIdentity) return 'none';
  if (emailIdentity.identity_data?.email_verified === true) return 'verified';
  if (user?.email_confirmed_at) return 'verified';
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
        setStatus(getEmailIdentityStatus(data.user ?? null));
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
