import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fetchNotifications } from '@/notification/api/notificationApi';
import type { Notification} from '@/notification/model/Notification';
import { NotificationType } from '@/notification/model/Notification';
import { useNotifications } from '../useNotifications';

// Mock supabaseReads
const mockFetchNotificationsFromSupabase = vi.fn();
vi.mock('@/shared/api/supabaseReads', () => ({
  fetchNotificationsFromSupabase: (...args: unknown[]) => mockFetchNotificationsFromSupabase(...args),
}));

// Mock Firebase Firestore (for Timestamp)
vi.mock('firebase/firestore', () => ({
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date() }),
    fromDate: (date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0, toDate: () => date }),
  },
}));

// Mock Sentry
const mockCaptureException = vi.fn();
vi.mock('@sentry/react', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

const createMockNotification = (id: string, timestamp: Timestamp): Notification => ({
  id,
  type: NotificationType.COMMENT_ON_POST,
  boardId: 'board-1',
  postId: 'post-1',
  fromUserId: 'user-1',
  message: 'Test notification',
  timestamp,
  read: false,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
};

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when userId is null', () => {
    it('does not fetch notifications', async () => {
      const { result } = renderHook(
        () => useNotifications(null, 10),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle');
      });

      expect(result.current.data).toBeUndefined();
      expect(mockFetchNotificationsFromSupabase).not.toHaveBeenCalled();
    });
  });

  describe('when userId is provided', () => {
    it('fetches notifications from Supabase', async () => {
      const now = new Date();
      const mockTimestamp = Timestamp.fromDate(now);
      const mockNotifications = [
        createMockNotification('notif-1', mockTimestamp),
        createMockNotification('notif-2', mockTimestamp),
      ];

      mockFetchNotificationsFromSupabase.mockResolvedValue(
        mockNotifications.map(n => ({
          id: n.id,
          type: n.type,
          boardId: n.boardId,
          postId: n.postId,
          fromUserId: n.fromUserId,
          message: n.message,
          timestamp: now.toISOString(),
          read: n.read,
        }))
      );

      const { result } = renderHook(
        () => useNotifications('user-123', 10),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetchNotificationsFromSupabase).toHaveBeenCalled();
      expect(result.current.data?.pages[0]).toHaveLength(2);
    });

    it('handles empty notifications list', async () => {
      mockFetchNotificationsFromSupabase.mockResolvedValue([]);

      const { result } = renderHook(
        () => useNotifications('user-123', 10),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.pages[0]).toHaveLength(0);
    });
  });

  describe('when fetch fails', () => {
    it('captures exception with Sentry on error', async () => {
      const mockError = new Error('Supabase fetch failed');
      mockFetchNotificationsFromSupabase.mockRejectedValue(mockError);

      const { result } = renderHook(
        () => useNotifications('user-123', 10),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockCaptureException).toHaveBeenCalledWith(mockError);
    });
  });
});

describe('fetchNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns notifications with ids from Supabase data', async () => {
    const now = new Date();

    mockFetchNotificationsFromSupabase.mockResolvedValue([
      {
        id: 'notif-1',
        type: NotificationType.COMMENT_ON_POST,
        boardId: 'board-1',
        postId: 'post-1',
        fromUserId: 'user-1',
        message: 'Test',
        timestamp: now.toISOString(),
        read: false,
      },
    ]);

    const result = await fetchNotifications('user-123', 10);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('notif-1');
    expect(result[0].message).toBe('Test');
  });

  it('returns empty array when no notifications exist', async () => {
    mockFetchNotificationsFromSupabase.mockResolvedValue([]);

    const result = await fetchNotifications('user-123', 10);

    expect(result).toEqual([]);
  });

  it('fetches paginated results when after timestamp is provided', async () => {
    const now = new Date();
    const cursorTimestamp = Timestamp.fromDate(new Date(Date.now() - 1000000));

    mockFetchNotificationsFromSupabase.mockResolvedValue([
      {
        id: 'notif-page2-1',
        type: NotificationType.COMMENT_ON_POST,
        boardId: 'board-1',
        postId: 'post-1',
        fromUserId: 'user-1',
        message: 'Page 2 notification',
        timestamp: now.toISOString(),
        read: false,
      },
    ]);

    const result = await fetchNotifications('user-123', 10, cursorTimestamp);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('notif-page2-1');
    expect(result[0].message).toBe('Page 2 notification');
    // Verify the cursor was passed through
    expect(mockFetchNotificationsFromSupabase).toHaveBeenCalledWith(
      'user-123',
      10,
      expect.any(String) // ISO string from cursorTimestamp.toDate().toISOString()
    );
  });
});
