import type { Board } from '@/board/model/Board';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { createTimestamp } from '@/shared/model/Timestamp';

interface BoardJoinRow {
  id: string;
  title: string;
  description: string | null;
  first_day: string | null;
  last_day: string | null;
  cohort: number | null;
  created_at: string;
}

/** Row from: user_board_permissions + boards!inner join */
interface BoardPermissionWithJoins {
  board_id: string;
  permission: string;
  boards: BoardJoinRow | BoardJoinRow[];
}

/**
 * Fetch boards the user has permission to access.
 * Replaces: fetchBoardsWithUserPermissions in boardUtils.ts
 * Uses index: idx_permissions_user
 */
export async function fetchBoardsFromSupabase(userId: string): Promise<Board[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_board_permissions')
    .select(`
      board_id,
      permission,
      boards!inner (
        id,
        title,
        description,
        first_day,
        last_day,
        cohort,
        created_at
      )
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase fetchBoards error:', error);
    return [];
  }

  // Fetch waiting users for each board
  const boardIds = (data || []).map((row: { board_id: string }) => row.board_id);
  const { data: waitingData } = await supabase
    .from('board_waiting_users')
    .select('board_id, user_id')
    .in('board_id', boardIds.length > 0 ? boardIds : ['__none__']);

  const waitingByBoard: Record<string, string[]> = {};
  for (const w of waitingData || []) {
    if (!waitingByBoard[w.board_id]) waitingByBoard[w.board_id] = [];
    waitingByBoard[w.board_id].push(w.user_id);
  }

  return ((data || []) as BoardPermissionWithJoins[]).map((row) => {
    const board = Array.isArray(row.boards) ? row.boards[0] : row.boards;
    return {
      id: board.id,
      title: board.title,
      description: board.description || '',
      createdAt: new Date(board.created_at),
      firstDay: board.first_day ? createTimestamp(new Date(board.first_day)) : undefined,
      lastDay: board.last_day ? createTimestamp(new Date(board.last_day)) : undefined,
      cohort: board.cohort ?? undefined,
      waitingUsersIds: waitingByBoard[board.id] || [],
    };
  });
}

/**
 * Fetch a single board by ID.
 * Replaces: fetchBoardById in boardUtils.ts
 */
export async function fetchBoardByIdFromSupabase(boardId: string): Promise<Board | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('boards')
    .select('id, title, description, first_day, last_day, cohort, created_at')
    .eq('id', boardId)
    .single();

  if (error || !data) {
    if (error?.code !== 'PGRST116') { // not "no rows" error
      console.error('Supabase fetchBoardById error:', error);
    }
    return null;
  }

  // Fetch waiting users
  const { data: waitingData } = await supabase
    .from('board_waiting_users')
    .select('user_id')
    .eq('board_id', boardId);

  return {
    id: data.id,
    title: data.title,
    description: data.description || '',
    createdAt: new Date(data.created_at),
    firstDay: data.first_day ? createTimestamp(new Date(data.first_day)) : undefined,
    lastDay: data.last_day ? createTimestamp(new Date(data.last_day)) : undefined,
    cohort: data.cohort ?? undefined,
    waitingUsersIds: (waitingData || []).map((w: { user_id: string }) => w.user_id),
  };
}

/**
 * Fetch board title by ID.
 * Replaces: fetchBoardTitle in boardUtils.ts
 */
export async function fetchBoardTitleFromSupabase(boardId: string): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('boards')
    .select('title')
    .eq('id', boardId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return 'Board not found';
    }
    console.error('Supabase fetchBoardTitle error:', error);
    throw error;
  }

  if (!data) {
    return 'Board not found';
  }

  return data.title;
}
