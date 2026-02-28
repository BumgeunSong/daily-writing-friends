import { getSupabaseClient } from '@/shared/api/supabaseClient';
import type { AuthUser } from '@/shared/hooks/useAuth';
import { mapToAuthUser } from '@/shared/auth/supabaseAuth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Wait for Supabase Auth to initialize (for use in loaders).
 * Returns the current user or null if not authenticated.
 * Returns null for legacy Firebase UIDs to force re-login.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) return null;

  if (!UUID_RE.test(session.user.id)) return null;

  return mapToAuthUser(session.user);
}
