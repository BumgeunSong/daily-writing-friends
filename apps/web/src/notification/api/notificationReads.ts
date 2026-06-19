import { getSupabaseClient } from '@/shared/api/supabaseClient';
import type { Notification } from '@/notification/model/Notification';

import {
  parseNotificationRow,
  type SupabaseNotificationRow,
} from './notificationParsers';

/**
 * Fetch notifications for a user from Supabase.
 *
 * Parses each row at the trust boundary into a strongly-typed `Notification`
 * (discriminated union). Invalid rows throw — there is no weak intermediate
 * DTO. Uses index: idx_notifications_recipient_created.
 */
export async function fetchNotificationsFromSupabase(
  userId: string,
  limitCount: number,
  after?: string,
): Promise<Notification[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limitCount);

  if (after) {
    query = query.lt('created_at', after);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase fetchNotifications error:', error);
    throw error;
  }

  return (data || []).map((row) => parseNotificationRow(row as SupabaseNotificationRow));
}
