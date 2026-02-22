import { Draft } from '@/draft/model/Draft';
import { getSupabaseClient, throwOnError } from '@/shared/api/supabaseClient';

export async function saveDraft(draft: Omit<Draft, 'id' | 'savedAt'> & { id?: string }, userId: string): Promise<Draft> {
  if (!userId?.trim()) {
    throw new Error('userId is required');
  }
  if (!draft.boardId?.trim()) {
    throw new Error('boardId is required');
  }
  if (typeof draft.title !== 'string') {
    throw new Error('title must be a string');
  }
  if (typeof draft.content !== 'string') {
    throw new Error('content must be a string');
  }

  const supabase = getSupabaseClient();
  const draftId = draft.id || crypto.randomUUID();
  const savedAt = new Date().toISOString();

  throwOnError(await supabase.from('drafts').upsert({
    id: draftId,
    user_id: userId,
    board_id: draft.boardId,
    title: draft.title,
    content: draft.content,
    saved_at: savedAt,
  }));

  return {
    id: draftId,
    boardId: draft.boardId,
    title: draft.title,
    content: draft.content,
    savedAt,
  };
}

export async function getDrafts(userId: string, boardId?: string): Promise<Draft[]> {
  const supabase = getSupabaseClient();

  let q = supabase
    .from('drafts')
    .select('*')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });

  if (boardId) {
    q = q.eq('board_id', boardId);
  }

  const { data, error } = await q;
  if (error) {
    console.error('Error fetching drafts:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    content: row.content,
    savedAt: row.saved_at,
  }));
}

export async function getDraftById(userId: string, draftId: string): Promise<Draft | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('id', draftId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    boardId: data.board_id,
    title: data.title,
    content: data.content,
    savedAt: data.saved_at,
  };
}

export async function deleteDraft(userId: string, draftId: string): Promise<void> {
  const supabase = getSupabaseClient();
  throwOnError(await supabase.from('drafts').delete().eq('id', draftId).eq('user_id', userId));
}


// 임시 저장 글 날짜 포맷팅 - 사용자의 로케일 기반
export const formatDraftDate = (savedAt: string) => {
  const date = new Date(savedAt);
  return new Intl.DateTimeFormat(navigator.language || 'ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// 임시 저장 글 제목 표시 (비어있으면 '제목 없음' 표시)
export const getDraftTitle = (draft: Draft) => {
  return draft.title.trim() ? draft.title : '(제목 없음)';
};

// 임시 저장 글 내용 미리보기 (최대 50자)
export const getDraftPreview = (draft: Draft) => {
  const plainText = draft.content.replace(/<[^>]*>/g, ''); // HTML 태그 제거
  return plainText.length > 50
    ? plainText.substring(0, 50) + '...'
    : plainText || '(내용 없음)';
};
