import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { ROUTES } from '@/login/constants';
import type { AuthUser } from '@/shared/hooks/useAuth';

/**
 * Sign in with Google OAuth via Supabase (redirect flow).
 * User is redirected to Google, then back to the app.
 * Supabase client auto-extracts session from URL hash on return.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabaseClient();

  // Detect Kakao in-app browser and redirect to external browser
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('kakaotalk')) {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.origin)}`;
    throw new Error('카카오톡 인앱 브라우저에서는 로그인할 수 없습니다. 외부 브라우저로 이동합니다.');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) throw error;
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Sign in with email/password (local testing only).
 */
export async function signInWithTestCredentials(
  email: string,
  password: string,
): Promise<void> {
  if (import.meta.env.PROD) { throw new Error('signInWithTestCredentials is not available in production.'); }
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Update the current user's auth metadata (displayName, avatar).
 */
export async function updateAuthUserMetadata(metadata: {
  full_name?: string;
  avatar_url?: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ data: metadata });
  if (error) throw error;
}

/**
 * Sign up with email + password. Triggers Supabase verification email.
 * Auto-links to existing identity if email matches a verified user.
 */
export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}${ROUTES.LOGIN}` },
  });
  if (error) throw error;
}

/**
 * Sign in with email + password.
 * Throws "Email not confirmed" when verification is pending.
 */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Send password reset link. Redirects user back to /set-password with token.
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${ROUTES.SET_PASSWORD}`,
  });
  if (error) throw error;
}

/**
 * Resend the verification email for an unconfirmed signup.
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

/**
 * Set or change the password for the currently authenticated user.
 * Used by Settings flow — requires active session.
 */
export async function setPasswordForCurrentUser(newPassword: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export function mapToAuthUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: (user.user_metadata?.full_name as string) ?? null,
    photoURL: (user.user_metadata?.avatar_url as string) ?? null,
  };
}
