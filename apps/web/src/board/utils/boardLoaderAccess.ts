import { SupabaseNetworkError } from '@/shared/api/supabaseClient';

const MISSING_BOARD_ID_MESSAGE = 'Missing board ID';
const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인하고 다시 시도해주세요.';
const VALIDATION_FAILED_MESSAGE = 'Board access validation failed';

export function buildMissingBoardIdResponse(): Response {
  return new Response(MISSING_BOARD_ID_MESSAGE, { status: 400 });
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
