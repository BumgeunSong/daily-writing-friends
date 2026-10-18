import { redirect } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { SupabaseNetworkError } from '@/shared/external/supabaseClient';
import { SESSION_KEYS, sessionStore } from '@/shared/lib/storage';

const MISSING_BOARD_ID_MESSAGE = 'Missing board ID';
const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인하고 다시 시도해주세요.';
const VALIDATION_FAILED_MESSAGE = 'Board access validation failed';

export function buildMissingBoardIdResponse(): Response {
  return new Response(MISSING_BOARD_ID_MESSAGE, { status: 400 });
}

export function boardPath(boardId: string): string {
  return `/board/${boardId}`;
}

/**
 * Store the board the visitor was headed to so login can return them there,
 * matching what the PrivateRoutes guard records on its own redirect.
 */
export function rememberBoardReturnPath(boardId: string): void {
  sessionStore.set(SESSION_KEYS.RETURN_TO, boardPath(boardId));
}

export function buildSignedOutRedirect(): Response {
  return redirect(ROUTES.LOGIN);
}

/**
 * A redirect is normal loader control flow, not a failure, so callers skip the
 * error logging and status mapping they apply to thrown error Responses.
 */
export function isRedirectResponse(error: unknown): boolean {
  return error instanceof Response && error.status >= 300 && error.status < 400;
}

/**
 * Status-code contract for thrown values escaping boardLoader:
 *   - Response (already shaped by a guard, e.g. 403) → passthrough
 *   - SupabaseNetworkError → 503
 *   - anything else → 500 (board access could not be validated)
 */
export function mapBoardLoaderError(error: unknown): Response {
  if (error instanceof Response) return error;
  if (error instanceof SupabaseNetworkError) {
    return new Response(NETWORK_ERROR_MESSAGE, { status: 503 });
  }
  return new Response(VALIDATION_FAILED_MESSAGE, { status: 500 });
}
