import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildNotificationMessage, type NotificationType } from '../_shared/notificationMessages.ts';
import { extractMentionUserIds, extractPlainText } from '../_shared/extractMentions.ts';
import { computeNotificationRecipients } from '../_shared/notificationRecipients.ts';

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

const MENTION_ON_COMMENT: NotificationType = 'mention_on_comment';
const MENTION_ON_REPLY: NotificationType = 'mention_on_reply';

function isMentionType(type: NotificationType): boolean {
  return type === MENTION_ON_COMMENT || type === MENTION_ON_REPLY;
}

// PostgreSQL unique_violation. The mention 팬아웃은 idempotency 인덱스에 기대어
// 같은 답글이 트리거를 두 번 타도(reply_on_post/reply_on_comment) 멘션 행이
// 한 번만 남게 하므로, 중복 insert는 실패가 아니라 정상 무시로 취급한다.
function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}

serve(async (req) => {
  try {
    // Only allow service_role calls (DB triggers via pg_net).
    // --verify-jwt ensures a valid JWT, but we additionally check the role claim
    // to reject end-user JWTs and prevent notification spoofing.
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    try {
      const claims: unknown = JSON.parse(atob(token.split('.')[1]));
      if (
        typeof claims !== 'object' ||
        claims === null ||
        (claims as { role?: unknown }).role !== 'service_role'
      ) {
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

    let structuralRecipientId: string | null = null;
    let boardId: string | null = null;
    let postId: string | null = payload.post_id || null;
    let commentId: string | null = payload.comment_id || null;
    let replyId: string | null = payload.reply_id || null;
    let structuralPreview = '';

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
    const actorName = actor.nickname || actor.real_name || '';

    switch (payload.type) {
      case 'comment_on_post':
      case 'like_on_post':
      case 'reply_on_post': {
        const { data: post } = await supabase
          .from('posts')
          .select('author_id, board_id, title')
          .eq('id', payload.post_id)
          .single();
        structuralRecipientId = post?.author_id ?? null;
        boardId = post?.board_id ?? null;
        structuralPreview = post?.title || '';
        break;
      }
      case 'reply_on_comment':
      case 'reaction_on_comment': {
        const { data: comment } = await supabase
          .from('comments')
          .select('user_id, post_id, content, content_json')
          .eq('id', payload.comment_id)
          .single();
        structuralRecipientId = comment?.user_id ?? null;
        postId = comment?.post_id ?? postId;
        commentId = payload.comment_id || null;

        const { data: post } = await supabase
          .from('posts')
          .select('board_id')
          .eq('id', comment?.post_id)
          .single();
        boardId = post?.board_id ?? null;

        structuralPreview = comment?.content_json
          ? extractPlainText(comment.content_json)
          : comment?.content || '';
        break;
      }
      case 'reaction_on_reply': {
        const { data: reply } = await supabase
          .from('replies')
          .select('user_id, post_id, comment_id, content, content_json')
          .eq('id', payload.reply_id)
          .single();
        structuralRecipientId = reply?.user_id ?? null;
        postId = reply?.post_id ?? postId;
        commentId = reply?.comment_id || null;

        const { data: post } = await supabase
          .from('posts')
          .select('board_id')
          .eq('id', reply?.post_id)
          .single();
        boardId = post?.board_id ?? null;

        structuralPreview = reply?.content_json
          ? extractPlainText(reply.content_json)
          : reply?.content || '';
        break;
      }
    }

    // Resolve the mention source: the newly created comment/reply whose
    // content_json carries the mention nodes. Reactions/likes have no content.
    let mentionType: NotificationType | null = null;
    let mentionPreview = '';
    let mentionContentJson: unknown = null;
    if (payload.type === 'comment_on_post' && payload.comment_id) {
      const { data: comment } = await supabase
        .from('comments')
        .select('content, content_json')
        .eq('id', payload.comment_id)
        .single();
      mentionType = MENTION_ON_COMMENT;
      mentionContentJson = comment?.content_json ?? null;
      mentionPreview = comment?.content_json
        ? extractPlainText(comment.content_json)
        : comment?.content || '';
      commentId = payload.comment_id;
    } else if (
      (payload.type === 'reply_on_post' || payload.type === 'reply_on_comment') &&
      payload.reply_id
    ) {
      const { data: reply } = await supabase
        .from('replies')
        .select('content, content_json')
        .eq('id', payload.reply_id)
        .single();
      mentionType = MENTION_ON_REPLY;
      mentionContentJson = reply?.content_json ?? null;
      mentionPreview = reply?.content_json
        ? extractPlainText(reply.content_json)
        : reply?.content || '';
      replyId = payload.reply_id;
    }

    // Board-permission defense layer: only notify mentioned users who can read
    // the board. This backstops the client-side participant filter at the
    // privacy boundary. Self is excluded inside computeNotificationRecipients.
    let mentionUserIds: string[] = [];
    if (mentionType && mentionContentJson && boardId) {
      const rawIds = extractMentionUserIds(mentionContentJson);
      if (rawIds.length > 0) {
        const { data: perms, error: permError } = await supabase
          .from('user_board_permissions')
          .select('user_id')
          .eq('board_id', boardId)
          .in('user_id', rawIds);
        if (permError) {
          // 권한 조회 실패 시 멘션은 건너뛴다. 접근 권한을 확인하지 못한 사람에게
          // 알림을 보내지 않는 쪽이 프라이버시상 안전하다. 조용히 사라지지 않도록
          // 로그를 남겨 장애를 추적할 수 있게 한다(구조적 알림은 그대로 진행).
          console.error('Mention permission lookup failed; skipping mentions', {
            boardId,
            error: permError.message,
          });
        } else {
          const allowed = new Set((perms ?? []).map((p) => p.user_id));
          mentionUserIds = rawIds.filter((id) => allowed.has(id));
        }
      }
    }

    // Ensure required fields exist
    if (!boardId || !postId) {
      console.error('Missing boardId or postId for notification', { boardId, postId, type: payload.type });
      return new Response(JSON.stringify({ status: 'skipped', reason: 'missing_context' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const targets = computeNotificationRecipients({
      structuralRecipientId,
      structuralType: payload.type,
      mentionType,
      mentionUserIds,
      actorId: payload.author_id,
    });

    if (targets.length === 0) {
      return new Response(JSON.stringify({ status: 'skipped', reason: 'no_recipients' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let created = 0;
    let duplicate = 0;
    const failures: { message: string }[] = [];

    for (const target of targets) {
      const mention = isMentionType(target.type);
      const preview = mention ? mentionPreview : structuralPreview;

      const notificationRow: Record<string, unknown> = {
        recipient_id: target.recipientId,
        type: target.type,
        actor_id: payload.author_id,
        board_id: boardId,
        post_id: postId,
        message: buildNotificationMessage(target.type, actorName, preview),
        read: false,
      };

      if (target.type === MENTION_ON_COMMENT) {
        // Keep the idempotency key stable across trigger calls: mention rows
        // carry only their own id column, never the sibling structural ids.
        notificationRow.comment_id = commentId;
      } else if (target.type === MENTION_ON_REPLY) {
        notificationRow.reply_id = replyId;
      } else {
        if (commentId) notificationRow.comment_id = commentId;
        if (replyId) notificationRow.reply_id = replyId;
        if (payload.reaction_id) notificationRow.reaction_id = payload.reaction_id;
        if (payload.like_id) notificationRow.like_id = payload.like_id;
      }

      const { error: insertError } = await supabase.from('notifications').insert(notificationRow);
      if (insertError) {
        if (isUniqueViolation(insertError)) {
          duplicate++;
          continue;
        }
        console.error('Error inserting notification:', insertError);
        failures.push({ message: insertError.message });
      } else {
        created++;
      }
    }

    if (failures.length > 0) {
      // Log to failed_notifications for retry. Retrying is safe because the
      // idempotency index turns already-created rows into benign duplicates.
      await supabase.from('failed_notifications').insert({
        payload: payload as unknown as Record<string, unknown>,
        error_message: failures.map((f) => f.message).join('; '),
      });

      return new Response(
        JSON.stringify({ status: 'partial', created, duplicate, failed: failures.length }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ status: 'created', created, duplicate }), {
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
