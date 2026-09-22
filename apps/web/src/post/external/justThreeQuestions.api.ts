// eslint-disable-next-line no-restricted-imports -- 기존 위반: external/ 레이어로 이관 예정인 raw 접근
import { getSupabaseClient, throwOnError } from '@/shared/external/supabaseClient';

export async function fetchJustThreeQuestions(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const result = await supabase.from('just_three_questions').select('question');
  throwOnError(result);
  return (result.data ?? []).map((row) => row.question);
}
