import { getSupabaseClient } from '@/shared/external/supabaseClient';
import type { Notification } from '@/notification/model/Notification';

import { NOTIFICATION_SELECT } from './notification.mapper';
import { parseNotificationRow } from './notification.parser';
import {
  buildKeysetOrFilter,
  deriveNextCursor,
  type NotificationCursor,
} from './notificationCursor';

/** One page of the notification feed plus the cursor to fetch the next one. */
export interface NotificationPage {
  notifications: Notification[];
  nextCursor: NotificationCursor | null;
}

/**
 * Fetch one page of notifications for a user from Supabase.
 *
 * Parses each row at the trust boundary into a strongly-typed `Notification`
 * (discriminated union). Invalid rows throw — there is no weak intermediate DTO.
 *
 * Ordered by `(created_at DESC, id DESC)` and paginated with a keyset cursor on
 * that same tuple. `created_at` is not unique, so ordering and the cursor both
 * need the `id` tiebreaker; a plain `created_at`-only cursor silently drops rows
 * that share a timestamp across a page boundary.
 */
export async function fetchNotificationsFromSupabase(
  userId: string,
  limitCount: number,
  cursor?: NotificationCursor,
): Promise<NotificationPage> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limitCount);

  if (cursor) {
    query = query.or(buildKeysetOrFilter(cursor));
  }

  const { data, error } = await query;

  if (error) throw error;
  const rows = data ?? [];
  return {
    notifications: rows.map(parseNotificationRow),
    nextCursor: deriveNextCursor(rows, limitCount),
  };
}
