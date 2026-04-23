import { render, screen } from '@testing-library/react';
import { type FirebaseTimestamp } from '@/shared/model/Timestamp';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import type { Notification } from '@/notification/model/Notification';
import { NotificationType } from '@/notification/model/Notification';
import type { CommentNotification } from '@/notification/model/Notification';
import { NotificationItem } from '../NotificationItem';

const createMockNotification = (overrides: Partial<CommentNotification> = {}): Notification => {
  const mockDate = new Date('2026-01-04T10:00:00Z');
  return {
    id: 'notif-1',
    type: NotificationType.COMMENT_ON_POST,
    boardId: 'board-123',
    postId: 'post-456',
    commentId: 'comment-789',
    fromUserId: 'user-789',
    fromUserProfileImage: 'https://example.com/avatar.jpg',
    message: 'John님이 댓글을 남겼습니다.',
    timestamp: {
      seconds: mockDate.getTime() / 1000,
      nanoseconds: 0,
      toDate: () => mockDate,
    } as FirebaseTimestamp,
    read: false,
    ...overrides,
  };
};

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('NotificationItem', () => {
  describe('rendering', () => {
    it('renders notification message', () => {
      const notification = createMockNotification({
        message: '테스트 메시지입니다.',
      });

      renderWithRouter(<NotificationItem notification={notification} />);

      expect(screen.getByText('테스트 메시지입니다.')).toBeInTheDocument();
    });

    it('renders notification timestamp', () => {
      const mockDate = new Date('2026-01-04T10:00:00Z');
      const notification = createMockNotification({
        timestamp: {
          seconds: mockDate.getTime() / 1000,
          nanoseconds: 0,
          toDate: () => mockDate,
        } as FirebaseTimestamp,
      });

      renderWithRouter(<NotificationItem notification={notification} />);

      expect(screen.getByText(mockDate.toLocaleString())).toBeInTheDocument();
    });

    it('renders avatar component', () => {
      const notification = createMockNotification({
        fromUserProfileImage: 'https://example.com/user-avatar.png',
      });

      renderWithRouter(<NotificationItem notification={notification} />);

      // Avatar component renders - in test env image doesn't load so fallback shows
      // Just verify the avatar area exists with the fallback
      expect(screen.getByText('US')).toBeInTheDocument();
    });

    it('renders avatar fallback with user id initials', () => {
      const notification = createMockNotification({
        fromUserId: 'testuser123',
        fromUserProfileImage: undefined,
      });

      renderWithRouter(<NotificationItem notification={notification} />);

      expect(screen.getByText('TE')).toBeInTheDocument();
    });
  });

  describe('link generation', () => {
    // T.13: comment_on_post navigates to post URL (unchanged)
    it('generates correct post link URL for comment_on_post', () => {
      const notification = createMockNotification({
        boardId: 'my-board',
        postId: 'my-post',
      });

      renderWithRouter(<NotificationItem notification={notification} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/board/my-board/post/my-post');
    });

    // T.12: topic_presenter_assigned navigates to /board/:boardId (no postId in URL)
    it('generates board-only link for topic_presenter_assigned', () => {
      const mockDate = new Date('2026-01-04T10:00:00Z');
      const notification: Notification = {
        id: 'notif-topic',
        type: NotificationType.TOPIC_PRESENTER_ASSIGNED,
        boardId: 'board-123',
        fromUserId: 'system-user',
        message: '글쓰기 모임에서 이번 주 발표자로 선정되었어요!',
        timestamp: {
          seconds: mockDate.getTime() / 1000,
          nanoseconds: 0,
          toDate: () => mockDate,
        } as FirebaseTimestamp,
        read: false,
      };

      renderWithRouter(<NotificationItem notification={notification} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/board/board-123');
    });
  });

  describe('read status styling', () => {
    it('applies unread styling when notification is not read', () => {
      const notification = createMockNotification({
        read: false,
      });

      renderWithRouter(<NotificationItem notification={notification} />);

      const container = screen.getByRole('link').querySelector('div');
      expect(container).toHaveClass('bg-card');
    });

    it('does not apply unread styling when notification is read', () => {
      const notification = createMockNotification({
        read: true,
      });

      renderWithRouter(<NotificationItem notification={notification} />);

      const container = screen.getByRole('link').querySelector('div');
      expect(container).not.toHaveClass('bg-card');
    });
  });
});
