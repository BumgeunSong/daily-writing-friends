import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { Timestamp } from 'firebase/firestore';
import { useNotifications } from '../useNotifications';
import { fetchNotifications } from '@/notification/api/notificationApi';
import { Notification, NotificationType } from '@/notification/model/Notification';

// Mock Firebase
vi.mock('@/firebase', () => ({
  firestore: {},
}));

// Mock Firebase Firestore
const mockGetDocs = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: () => mockGetDocs(),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
  },
}));

// Mock Sentry
vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
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

      // Query is disabled when userId is null, so fetchStatus should be 'idle'
      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle');
      });

      expect(result.current.data).toBeUndefined();
      expect(mockGetDocs).not.toHaveBeenCalled();
    });
  });

  describe('when userId is provided', () => {
    it('fetches notifications from Firestore', async () => {
      const mockTimestamp = { seconds: Date.now() / 1000, nanoseconds: 0 } as Timestamp;
      const mockNotifications = [
        createMockNotification('notif-1', mockTimestamp),
        createMockNotification('notif-2', mockTimestamp),
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockNotifications.map((n) => ({
          id: n.id,
          data: () => ({ ...n, id: undefined }),
        })),
      });

      const { result } = renderHook(
        () => useNotifications('user-123', 10),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetDocs).toHaveBeenCalled();
      expect(result.current.data?.pages[0]).toHaveLength(2);
    });

    it('handles empty notifications list', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
      });

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
});

describe('fetchNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns notifications with ids from document data', async () => {
    const mockTimestamp = { seconds: Date.now() / 1000, nanoseconds: 0 } as Timestamp;

    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'notif-1',
          data: () => ({
            type: NotificationType.COMMENT_ON_POST,
            boardId: 'board-1',
            postId: 'post-1',
            fromUserId: 'user-1',
            message: 'Test',
            timestamp: mockTimestamp,
            read: false,
          }),
        },
      ],
    });

    const result = await fetchNotifications('user-123', 10);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('notif-1');
    expect(result[0].message).toBe('Test');
  });

  it('returns empty array when no notifications exist', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [],
    });

    const result = await fetchNotifications('user-123', 10);

    expect(result).toEqual([]);
  });
});
