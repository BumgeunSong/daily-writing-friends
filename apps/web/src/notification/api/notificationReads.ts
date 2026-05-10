import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { NotificationType } from '@/notification/model/Notification';

// --- Notifications ---

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  boardId: string;
  postId: string;
  commentId?: string;
  replyId?: string;
  fromUserId: string;
  fromUserProfileImage?: string;
  message: string;
  timestamp: string; // ISO string from Supabase
  read: boolean;
}

/**
 * Fetch notifications for a user from Supabase.
 * Replaces: fetchNotifications in notificationApi.ts
 * Uses index: idx_notifications_recipient_created
 */
export async function fetchNotificationsFromSupabase(
  userId: string,
  limitCount: number,
  after?: string
): Promise<NotificationDTO[]> {
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

  // Batch-fetch actor profile images
  const actorIds = [...new Set((data || []).map(row => row.actor_id))];
  const profileMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors, error: actorsError } = await supabase
      .from('users')
      .select('id, profile_photo_url')
      .in('id', actorIds);
    if (actorsError) {
      console.error('Supabase fetchNotifications users lookup error:', actorsError);
    }
    for (const actor of actors || []) {
      if (actor.profile_photo_url) {
        profileMap.set(actor.id, actor.profile_photo_url);
      }
    }
  }

  return (data || []).map(row => ({
    id: row.id,
    // type is validated downstream by mapDTOToNotification's exhaustive switch
    type: row.type as NotificationType,
    boardId: row.board_id,
    postId: row.post_id,
    commentId: row.comment_id || undefined,
    replyId: row.reply_id || undefined,
    fromUserId: row.actor_id,
    fromUserProfileImage: profileMap.get(row.actor_id) || undefined,
    message: row.message,
    timestamp: row.created_at,
    read: row.read,
  }));
}
