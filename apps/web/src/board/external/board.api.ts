import type { Board } from '@/board/model/Board';
import type { Database } from '@/shared/external/database.types';
import { getSupabaseClient, throwOnError } from '@/shared/external/supabaseClient';
import { createTimestamp } from '@/shared/model/Timestamp';

type BoardRow = Pick<
  Database['public']['Tables']['boards']['Row'],
  'id' | 'title' | 'description' | 'first_day' | 'last_day' | 'cohort' | 'created_at'
>;

type WaitingUserRow = Pick<
  Database['public']['Tables']['board_waiting_users']['Row'],
  'board_id' | 'user_id'
>;

const BOARD_SELECT = 'id, title, description, first_day, last_day, cohort, created_at';

/**
 * Pure: index waiting-user ids by their board id so each board can look up its
 * own list in one pass instead of re-scanning the flat rows per board.
 */
export function groupWaitingUserIdsByBoard(rows: WaitingUserRow[]): Record<string, string[]> {
  const byBoard: Record<string, string[]> = {};
  for (const row of rows) {
    (byBoard[row.board_id] ??= []).push(row.user_id);
  }
  return byBoard;
}

/**
 * Pure: project a boards row (and its already-resolved waiting ids) onto the
 * Board domain model. Nullable columns collapse to the domain's absence values
 * (`''` for description, `undefined` for optional dates/cohort).
 */
export function mapToBoard(row: BoardRow, waitingUserIds: string[]): Board {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    createdAt: new Date(row.created_at),
    firstDay: row.first_day ? createTimestamp(new Date(row.first_day)) : undefined,
    lastDay: row.last_day ? createTimestamp(new Date(row.last_day)) : undefined,
    cohort: row.cohort ?? undefined,
    waitingUsersIds: waitingUserIds,
  };
}

/**
 * Fetch boards the user has permission to access.
 * Uses index: idx_permissions_user
 */
export async function fetchBoardsFromSupabase(userId: string): Promise<Board[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_board_permissions')
    .select(`board_id, permission, boards!inner (${BOARD_SELECT})`)
    .eq('user_id', userId);

  if (error) throw error;
  const rows = data ?? [];

  const boardIds = rows.map((row) => row.board_id);
  const { data: waitingData, error: waitingError } = await supabase
    .from('board_waiting_users')
    .select('board_id, user_id')
    .in('board_id', boardIds.length > 0 ? boardIds : ['__none__']);
  if (waitingError) throw waitingError;

  const waitingByBoard = groupWaitingUserIdsByBoard(waitingData ?? []);

  return rows.map((row) => mapToBoard(row.boards, waitingByBoard[row.boards.id] ?? []));
}

/**
 * Fetch a single board by ID. Returns null only when the board does not exist.
 */
export async function fetchBoardByIdFromSupabase(boardId: string): Promise<Board | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('boards')
    .select(BOARD_SELECT)
    .eq('id', boardId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no rows for this id
    throw error;
  }

  const { data: waitingData, error: waitingError } = await supabase
    .from('board_waiting_users')
    .select('user_id')
    .eq('board_id', boardId);
  if (waitingError) throw waitingError;

  return mapToBoard(data, (waitingData ?? []).map((w) => w.user_id));
}

/**
 * Fetch board title by ID. A missing board resolves to a sentinel title rather
 * than an error, since callers render it inline.
 */
export async function fetchBoardTitleFromSupabase(boardId: string): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('boards')
    .select('title')
    .eq('id', boardId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return 'Board not found';
    throw error;
  }

  return data.title;
}

/**
 * Add a user to a board's waiting list. Throws on failure; callers decide how to
 * degrade.
 */
export async function addUserToBoardWaitingListInSupabase(boardId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  throwOnError(await supabase.from('board_waiting_users').upsert({
    board_id: boardId,
    user_id: userId,
  }));
}

/**
 * Remove a user from a board's waiting list. Throws on failure.
 */
export async function removeUserFromBoardWaitingListInSupabase(boardId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  throwOnError(await supabase
    .from('board_waiting_users')
    .delete()
    .eq('board_id', boardId)
    .eq('user_id', userId));
}
