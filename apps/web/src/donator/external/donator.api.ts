import type { Database } from '@/shared/external/database.types';
import { getSupabaseClient } from '@/shared/external/supabaseClient';

type DonatorStatusResponse = Pick<Database['public']['Views']['donator_status']['Row'], 'user_id'>;

/**
 * Pure: projects donator_status rows to their user ids.
 *
 * The `donator_status` view types `user_id` as nullable, so null rows are
 * dropped rather than leaking into the donator id set as `undefined`. This is
 * the shape the previous `as DonatorStatusRow[]` cast silently hid.
 */
export function mapToDonatorUserIds(rows: DonatorStatusResponse[]): string[] {
  return rows.map((row) => row.user_id).filter((id): id is string => id !== null);
}

export async function fetchActiveDonatorIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('donator_status')
    .select('user_id')
    .in('user_id', userIds);

  if (error) throw error;
  return mapToDonatorUserIds(data ?? []);
}
