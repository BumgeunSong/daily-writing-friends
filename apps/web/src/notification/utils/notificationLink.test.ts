import { describe, it, expect } from 'vitest';

import { createTimestamp } from '@/shared/model/Timestamp';
import { NotificationType, type Notification } from '@/notification/model/Notification';
import { buildNotificationLink } from './notificationLink';

const base = {
  id: 'n-1',
  boardId: 'board-1',
  postId: 'post-1',
  fromUserId: 'user-1',
  message: 'm',
  timestamp: createTimestamp(new Date()),
  read: false,
};

describe('buildNotificationLink', () => {
  it('links to the comment for comment/reaction/mention-on-comment', () => {
    const types = [
      NotificationType.COMMENT_ON_POST,
      NotificationType.REACTION_ON_COMMENT,
      NotificationType.MENTION_ON_COMMENT,
    ] as const;
    for (const type of types) {
      const n = { ...base, type, commentId: 'c-9' } as Notification;
      expect(buildNotificationLink(n)).toBe('/board/board-1/post/post-1?commentId=c-9');
    }
  });

  it('carries both comment and reply ids when the target is a reply under a known comment', () => {
    const replyOnComment = {
      ...base,
      type: NotificationType.REPLY_ON_COMMENT,
      commentId: 'c-9',
      replyId: 'r-3',
    } as Notification;
    expect(buildNotificationLink(replyOnComment)).toBe(
      '/board/board-1/post/post-1?commentId=c-9&replyId=r-3',
    );

    const reactionOnReply = {
      ...base,
      type: NotificationType.REACTION_ON_REPLY,
      commentId: 'c-9',
      replyId: 'r-3',
    } as Notification;
    expect(buildNotificationLink(reactionOnReply)).toBe(
      '/board/board-1/post/post-1?commentId=c-9&replyId=r-3',
    );
  });

  it('carries only the reply id when no parent comment is known', () => {
    const replyOnPost = {
      ...base,
      type: NotificationType.REPLY_ON_POST,
      replyId: 'r-3',
    } as Notification;
    expect(buildNotificationLink(replyOnPost)).toBe('/board/board-1/post/post-1?replyId=r-3');

    const mentionOnReply = {
      ...base,
      type: NotificationType.MENTION_ON_REPLY,
      replyId: 'r-3',
    } as Notification;
    expect(buildNotificationLink(mentionOnReply)).toBe('/board/board-1/post/post-1?replyId=r-3');
  });

  it('links to the bare post for like-on-post (no comment or reply target)', () => {
    const like = { ...base, type: NotificationType.LIKE_ON_POST } as Notification;
    expect(buildNotificationLink(like)).toBe('/board/board-1/post/post-1');
  });
});
