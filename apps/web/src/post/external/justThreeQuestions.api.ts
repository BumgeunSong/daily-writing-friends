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
