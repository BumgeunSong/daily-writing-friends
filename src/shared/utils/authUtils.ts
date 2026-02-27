import { getSupabaseClient } from '@/shared/api/supabaseClient';
import type { AuthUser } from '@/shared/hooks/useAuth';
import { mapToAuthUser } from '@/shared/auth/supabaseAuth';

/**
 * Wait for Supabase Auth to initialize (for use in loaders).
 * Returns the current user or null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) return null;

  return mapToAuthUser(session.user);
}
