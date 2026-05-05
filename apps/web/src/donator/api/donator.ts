import { getSupabaseClient } from '@/shared/api/supabaseClient';
import {
  type DonatorStatus,
  type DonatorStatusRow,
  mapDonatorStatusRow,
} from '../model/DonatorStatus';

export async function fetchDonatorStatusBatch(userIds: string[]): Promise<DonatorStatus[]> {
  if (userIds.length === 0) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('donator_status')
    .select('user_id, latest_donated_at, active_until, donation_count')
    .in('user_id', userIds);

  if (error) throw error;
  return (data as DonatorStatusRow[]).map(mapDonatorStatusRow);
}
