import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildNotificationMessage, shouldSkipNotification, type NotificationType } from '../_shared/notificationMessages.ts';

interface NotificationPayload {
  type: NotificationType;
  comment_id?: string;
  reply_id?: string;
  like_id?: string;
  reaction_id?: string;
  post_id?: string;
  comment_id_for_reply?: string;
  author_id: string;
}

serve(async (req) => {
  try {
    // Only allow service_role calls (DB triggers via pg_net).
    // --verify-jwt ensures a valid JWT, but we additionally check the role claim
    // to reject end-user JWTs and prevent notification spoofing.
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    try {
      const claims = JSON.parse(atob(token.split('.')[1]));
      if (claims.role !== 'service_role') {
        return new Response('Forbidden', { status: 403 });
      }
    } catch {
      return new Response('Forbidden', { status: 403 });
    }

    const payload: NotificationPayload = await req.json();

    // Validate required fields
    if (!payload.type || !payload.author_id) {
      return new Response('Missing required fields', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let recipientId: string | null = null;
    let boardId: string | null = null;
    let postId: string | null = payload.post_id || null;
    let commentId: string | null = payload.comment_id || null;
    let replyId: string | null = payload.reply_id || null;
    let actorName = '';
    let message = '';

    // Fetch actor name
    const { data: actor, error: actorError } = await supabase
      .from('users')
      .select('nickname, real_name')
      .eq('id', payload.author_id)
      .single();
    if (actorError || !actor) {
      console.error('Actor not found:', payload.author_id, actorError);
      return new Response(JSON.stringify({ status: 'skipped', reason: 'actor_not_found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    actorName = actor.nickname || actor.real_name || '';

    switch (payload.type) {
      case 'comment_on_post':
      case 'like_on_post':
      case 'reply_on_post': {
        const { data: post } = await supabase
          .from('posts')
          .select('author_id, board_id, title')
          .eq('id', payload.post_id)
          .single();
        recipientId = post?.author_id;
        boardId = post?.board_id;
        message = buildNotificationMessage(payload.type, actorName, post?.title || '');
        break;
      }
      case 'reply_on_comment':
      case 'reaction_on_comment': {
        const { data: comment } = await supabase
          .from('comments')
          .select('user_id, post_id, content')
          .eq('id', payload.comment_id)
          .single();
        recipientId = comment?.user_id;
        postId = comment?.post_id;
        commentId = payload.comment_id || null;

        const { data: post } = await supabase
          .from('posts')
          .select('board_id')
          .eq('id', comment?.post_id)
          .single();
        boardId = post?.board_id;

        message = buildNotificationMessage(payload.type, actorName, comment?.content || '');
        break;
      }
      case 'reaction_on_reply': {
        const { data: reply } = await supabase
          .from('replies')
          .select('user_id, post_id, content')
          .eq('id', payload.reply_id)
          .single();
        recipientId = reply?.user_id;
        postId = reply?.post_id;

        const { data: post } = await supabase
          .from('posts')
          .select('board_id')
          .eq('id', reply?.post_id)
          .single();
        boardId = post?.board_id;

        message = buildNotificationMessage(payload.type, actorName, reply?.content || '');
        break;
      }
    }

    // Don't notify self
    if (shouldSkipNotification(recipientId, payload.author_id)) {
      return new Response(JSON.stringify({ status: 'skipped', reason: 'self_or_no_recipient' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure required fields exist
    if (!boardId || !postId) {
      console.error('Missing boardId or postId for notification', { boardId, postId, type: payload.type });
      return new Response(JSON.stringify({ status: 'skipped', reason: 'missing_context' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create notification — only include non-null optional fields
    const notificationRow: Record<string, unknown> = {
      recipient_id: recipientId,
      type: payload.type,
      actor_id: payload.author_id,
      board_id: boardId,
      post_id: postId,
      message,
      read: false,
    };
    if (commentId) notificationRow.comment_id = commentId;
    if (replyId) notificationRow.reply_id = replyId;
    if (payload.reaction_id) notificationRow.reaction_id = payload.reaction_id;
    if (payload.like_id) notificationRow.like_id = payload.like_id;

    const { error: insertError } = await supabase.from('notifications').insert(notificationRow);

    if (insertError) {
      console.error('Error inserting notification:', insertError);

      // Log to failed_notifications for retry
      await supabase.from('failed_notifications').insert({
        payload: payload as unknown as Record<string, unknown>,
        error_message: insertError.message,
      });

      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ status: 'created' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating notification:', error);

    // Try to log failure
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      await supabase.from('failed_notifications').insert({
        payload: { raw_error: 'parse_failure' },
        error_message: error instanceof Error ? error.message : String(error),
      });
    } catch {
      // If even logging fails, just console.error
      console.error('Failed to log notification failure');
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
