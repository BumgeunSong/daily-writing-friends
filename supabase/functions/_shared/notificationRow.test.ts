import { assertEquals } from 'jsr:@std/assert@1';
import { buildNotificationRow, classifyInsertResult, type NotificationRowContext } from './notificationRow.ts';

const base: NotificationRowContext = {
  actorId: 'actor-1',
  actorName: '행위자',
  boardId: 'board-1',
  postId: 'post-1',
  commentId: null,
  replyId: null,
  replyPostId: null,
  structuralPreview: '구조적 미리보기',
  mentionPreview: '멘션 미리보기',
};

Deno.test('buildNotificationRow', async (t) => {
  await t.step('mention_on_comment carries comment_id and NOT reply_id', () => {
    const row = buildNotificationRow(
      { recipientId: 'u-1', type: 'mention_on_comment' },
      { ...base, commentId: 'c-1' },
    );
    assertEquals(row.recipient_id, 'u-1');
    assertEquals(row.type, 'mention_on_comment');
    assertEquals(row.comment_id, 'c-1');
    assertEquals('reply_id' in row, false);
    assertEquals(row.board_id, 'board-1');
    assertEquals(row.post_id, 'post-1');
    assertEquals(row.actor_id, 'actor-1');
    assertEquals(row.read, false);
    assertEquals(row.message, "행위자님이 '멘션 미리보기' 댓글에서 나를 언급했어요.");
  });

  await t.step('mention_on_reply carries ONLY reply_id (never comment_id) — the dedup invariant', () => {
    const row = buildNotificationRow(
      { recipientId: 'u-2', type: 'mention_on_reply' },
      { ...base, commentId: 'c-1', replyId: 'r-1', replyPostId: 'post-1' },
    );
    assertEquals(row.reply_id, 'r-1');
    assertEquals('comment_id' in row, false);
    assertEquals(row.message, "행위자님이 '멘션 미리보기' 답글에서 나를 언급했어요.");
  });

  await t.step('mention_on_reply post_id comes from replyPostId (canonical), not structural postId', () => {
    const row = buildNotificationRow(
      { recipientId: 'u-2', type: 'mention_on_reply' },
      { ...base, postId: 'wrong-post', replyId: 'r-1', replyPostId: 'canonical-post' },
    );
    assertEquals(row.post_id, 'canonical-post');
  });

  await t.step('the two reply-trigger contexts produce IDENTICAL mention_on_reply rows', () => {
    // reply_on_post invocation: no comment_id in payload, post_id from payload
    const fromReplyOnPost = buildNotificationRow(
      { recipientId: 'u-2', type: 'mention_on_reply' },
      { ...base, commentId: null, replyId: 'r-1', replyPostId: 'post-1' },
    );
    // reply_on_comment invocation: comment_id present, post_id derived from comment
    const fromReplyOnComment = buildNotificationRow(
      { recipientId: 'u-2', type: 'mention_on_reply' },
      { ...base, commentId: 'c-1', replyId: 'r-1', replyPostId: 'post-1' },
    );
    assertEquals(fromReplyOnPost, fromReplyOnComment);
  });

  await t.step('structural reply_on_comment carries both comment_id and reply_id, structural preview', () => {
    const row = buildNotificationRow(
      { recipientId: 'author-1', type: 'reply_on_comment' },
      { ...base, commentId: 'c-1', replyId: 'r-1' },
    );
    assertEquals(row.comment_id, 'c-1');
    assertEquals(row.reply_id, 'r-1');
    assertEquals(row.message, "행위자님이 '구조적 미리보기' 댓글에 답글을 달았어요.");
  });

  await t.step('structural reply_on_post carries only reply_id', () => {
    const row = buildNotificationRow(
      { recipientId: 'author-1', type: 'reply_on_post' },
      { ...base, commentId: null, replyId: 'r-1' },
    );
    assertEquals(row.reply_id, 'r-1');
    assertEquals('comment_id' in row, false);
  });

  await t.step('structural like_on_post attaches like_id when present', () => {
    const row = buildNotificationRow(
      { recipientId: 'author-1', type: 'like_on_post' },
      { ...base, likeId: 'like-1' },
    );
    assertEquals(row.like_id, 'like-1');
    assertEquals('comment_id' in row, false);
    assertEquals('reply_id' in row, false);
  });

  await t.step('structural reaction_on_reply attaches reaction_id plus comment_id and reply_id', () => {
    const row = buildNotificationRow(
      { recipientId: 'author-1', type: 'reaction_on_reply' },
      { ...base, commentId: 'c-1', replyId: 'r-1', reactionId: 'react-1' },
    );
    assertEquals(row.reaction_id, 'react-1');
    assertEquals(row.comment_id, 'c-1');
    assertEquals(row.reply_id, 'r-1');
  });
});

Deno.test('classifyInsertResult', async (t) => {
  await t.step('no error means created', () => {
    assertEquals(classifyInsertResult(null), 'created');
    assertEquals(classifyInsertResult(undefined), 'created');
  });

  await t.step('unique_violation (23505) means duplicate', () => {
    assertEquals(classifyInsertResult({ code: '23505' }), 'duplicate');
  });

  await t.step('any other error means failed', () => {
    assertEquals(classifyInsertResult({ code: '23503' }), 'failed');
    assertEquals(classifyInsertResult({ code: undefined }), 'failed');
    assertEquals(classifyInsertResult({}), 'failed');
  });
});
