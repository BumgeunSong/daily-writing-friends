import { SupabaseNetworkError } from '@/shared/api/supabaseClient';
import type { User } from '@/user/model/User';

export type BoardAccessDenial = 'user-not-found' | 'no-permission';

const DENIAL_MESSAGES: Record<BoardAccessDenial, string> = {
  'user-not-found': 'User data not found',
  'no-permission': 'Access denied - insufficient board permissions',
};

const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인하고 다시 시도해주세요.';
const FALLBACK_NOT_FOUND_MESSAGE = 'Post not found';

/**
 * Decide whether the current user may read a board's detail content.
 * Returns null when access is allowed, otherwise a denial code that callers
 * convert to a 403 Response via {@link buildAccessDenialResponse}.
 *
 * Centralizing this prevents permission-string drift (e.g. accidentally
 * accepting 'admin' or rejecting 'write') from being fixed in one site
 * while another site stays broken.
 */
export function checkBoardAccess(
  userData: User | null,
  boardId: string,
): BoardAccessDenial | null {
  if (!userData) return 'user-not-found';
  const permission = userData.boardPermissions?.[boardId];
  if (permission !== 'read' && permission !== 'write') return 'no-permission';
  return null;
}

export function buildAccessDenialResponse(denial: BoardAccessDenial): Response {
  return new Response(DENIAL_MESSAGES[denial], { status: 403 });
}

/**
 * Map a thrown value from the post detail loader to the Response that
 * react-router will hand to errorElement. Defines the loader's status-code
 * contract:
 *   - Response (already shaped, e.g. 403 from a permission check) → passthrough
 *   - SupabaseNetworkError → 503
 *   - anything else → 404
 */
export function mapPostLoaderError(error: unknown): Response {
  if (error instanceof Response) return error;
  if (error instanceof SupabaseNetworkError) {
    return new Response(NETWORK_ERROR_MESSAGE, { status: 503 });
  }
  return new Response(FALLBACK_NOT_FOUND_MESSAGE, { status: 404 });
}
