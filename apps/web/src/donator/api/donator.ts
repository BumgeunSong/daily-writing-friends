import { getSupabaseClient } from '@/shared/api/supabaseClient';

interface DonatorStatusRow {
  user_id: string;
}

export async function fetchActiveDonatorIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('donator_status')
    .select('user_id')
    .in('user_id', userIds);

  if (error) throw error;
  return (data as DonatorStatusRow[] | null ?? []).map((row) => row.user_id);
}
