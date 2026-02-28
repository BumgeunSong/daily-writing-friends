import { render, screen } from '@testing-library/react';
import type { Timestamp } from 'firebase/firestore';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import type { Notification } from '@/notification/model/Notification';
import { NotificationType } from '@/notification/model/Notification';
import type { CommentNotification } from '@/notification/model/Notification';
import { NotificationItem } from '../NotificationItem';

// Mock Firebase Timestamp
vi.mock('firebase/firestore', () => ({
  Timestamp: {
    now: () => ({
      seconds: Date.now() / 1000,
      nanoseconds: 0,
      toDate: () => new Date(),
    }),
  },
}));

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
    } as Timestamp,
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
        } as Timestamp,
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
    it('generates correct link URL for notification', () => {
      const notification = createMockNotification({
        boardId: 'my-board',
        postId: 'my-post',
      });

      renderWithRouter(<NotificationItem notification={notification} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/board/my-board/post/my-post');
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
