import { getSupabaseClient } from '@/shared/api/supabaseClient';
import type { AuthUser } from '@/shared/hooks/useAuth';

/**
 * Wait for Supabase Auth to initialize (for use in loaders).
 * Returns the current user or null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) return null;

  return {
    uid: session.user.id,
    email: session.user.email ?? null,
    displayName: (session.user.user_metadata?.full_name as string) ?? null,
    photoURL: (session.user.user_metadata?.avatar_url as string) ?? null,
  };
}
