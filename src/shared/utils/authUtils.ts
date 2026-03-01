import { getSupabaseClient } from '@/shared/api/supabaseClient';
import type { AuthUser } from '@/shared/hooks/useAuth';
import { UUID_RE } from '@/shared/utils/authUserParser';
import { mapToAuthUser } from '@/shared/auth/supabaseAuth';

/**
 * Wait for Supabase Auth to initialize (for use in loaders).
 * Returns the current user or null if not authenticated.
 * Signs out legacy Firebase UID sessions to force re-login.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) return null;

  if (!UUID_RE.test(session.user.id)) {
    await supabase.auth.signOut();
    return null;
  }

  return mapToAuthUser(session.user);
}
