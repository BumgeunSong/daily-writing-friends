import { getSupabaseClient } from '@/shared/api/supabaseClient';
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
