import { getSupabaseClient, throwOnError } from '@/shared/api/supabaseClient';
import type { AssignedPresenter, TopicMission } from '@/topic/model/TopicMission';

interface TopicMissionRow {
  id: string;
  board_id: string;
  user_id: string;
  topic: string;
  order_index: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AssignedPresenterRow {
  user_id: string;
  topic: string;
  users: { nickname: string | null } | null;
}

export async function fetchAssignedPresenter(boardId: string): Promise<AssignedPresenter | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('topic_missions')
    .select('user_id, topic, users(nickname)')
    .eq('board_id', boardId)
    .eq('status', 'assigned')
    .maybeSingle();

  if (error) {
    console.error('fetchAssignedPresenter error:', error);
    throw error;
  }

  if (!data) return null;

  const row = data as unknown as AssignedPresenterRow;
  return {
    userId: row.user_id,
    userName: row.users?.nickname ?? null,
    topic: row.topic,
  };
}

export async function fetchCurrentUserMission(
  boardId: string,
  userId: string,
): Promise<TopicMission | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('topic_missions')
    .select('*')
    .eq('board_id', boardId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('fetchCurrentUserMission error:', error);
    throw error;
  }

  if (!data) return null;

  const row = data as TopicMissionRow;
  return {
    id: row.id,
    boardId: row.board_id,
    userId: row.user_id,
    topic: row.topic,
    orderIndex: row.order_index,
    status: row.status as TopicMission['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DUPLICATE_REGISTRATION_ERROR = '이미 이 게시판에 발표 주제를 등록하셨습니다.';
const UNIQUE_VIOLATION_CODE = '23505';

export async function registerTopic(
  boardId: string,
  topic: string,
  userId: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const result = await supabase.from('topic_missions').insert({
    board_id: boardId,
    user_id: userId,
    topic,
  });

  if (result.error?.code === UNIQUE_VIOLATION_CODE) {
    throw new Error(DUPLICATE_REGISTRATION_ERROR);
  }

  throwOnError(result, 'registerTopic');
}
