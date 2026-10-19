import { getSupabaseClient, throwOnError } from '@/shared/external/supabaseClient';

export async function fetchJustThreeQuestions(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const result = await supabase
    .from('just_three_questions')
    .select('question')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  throwOnError(result);
  return (result.data ?? []).map((row) => row.question);
}

const RECENT_POST_LIMIT = 10;
const RECENT_POST_WINDOW_DAYS = 10;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface PersonalizedQuestion {
  id: string;
  question: string;
}

/**
 * 사용자의 최근 public 글 10개 중 10일 이내이면서 아직 답하지 않은 개인화 질문.
 * 질문이 없는 글은 결과에 기여하지 않으므로 0 ~ 10개가 돌아온다.
 * 비공개로 바뀐 글은 조회 시점의 visibility 조건으로 빠지고, 삭제된 글의 질문은 FK cascade로 사라진다.
 */
export async function fetchPersonalizedQuestions(
  userId: string,
  now: Date = new Date(),
): Promise<PersonalizedQuestion[]> {
  const windowStart = new Date(now.getTime() - RECENT_POST_WINDOW_DAYS * MILLISECONDS_PER_DAY);
  const supabase = getSupabaseClient();
  const result = await supabase
    .from('posts')
    .select('id, personalized_questions(id, question, answered_at)')
    .eq('author_id', userId)
    .eq('visibility', 'public')
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(RECENT_POST_LIMIT);
  throwOnError(result);

  return (result.data ?? []).flatMap((post) => {
    const question = post.personalized_questions;
    if (!question || question.answered_at !== null) return [];
    return [{ id: question.id, question: question.question }];
  });
}

/**
 * RLS가 행을 걸러 내면 PostgREST는 오류 없이 0건을 갱신하므로, 갱신된 행 수를 확인해
 * 권한 문제를 성공으로 오해하지 않게 한다.
 */
export async function markPersonalizedQuestionsAnswered(
  questionIds: readonly string[],
  now: Date = new Date(),
): Promise<void> {
  if (questionIds.length === 0) return;
  const supabase = getSupabaseClient();
  const result = await supabase
    .from('personalized_questions')
    .update({ answered_at: now.toISOString() })
    .in('id', [...questionIds])
    .select('id');
  throwOnError(result);

  const updatedCount = result.data?.length ?? 0;
  if (updatedCount !== questionIds.length) {
    throw new Error(`personalized_questions: ${questionIds.length}건 중 ${updatedCount}건만 갱신됨`);
  }
}
