import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { useServerContributionGrid } from '../useServerContributionGrid';
import { ActivityType } from '@/stats/model/ContributionGrid';

// Mock Firebase
const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn(() => ({
  onSnapshot: mockOnSnapshot,
}));

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  onSnapshot: mockOnSnapshot,
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
    })),
  },
}));

// Mock Firebase app
vi.mock('@/firebase', () => ({
  firestore: {},
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}));

describe('useServerContributionGrid', () => {
  const mockUser = {
    uid: 'test-user-id',
  };

  const mockPostingGrid = {
    contributions: [
      { day: '2024-01-15', value: 100, week: 0, column: 1 },
      { day: '2024-01-16', value: 150, week: 0, column: 2 },
    ],
    maxValue: 150,
    lastUpdated: Timestamp.fromDate(new Date()),
    timeRange: {
      startDate: '2024-01-15',
      endDate: '2024-01-16',
    },
  };

  const mockCommentingGrid = {
    contributions: [
      { day: '2024-01-15', value: 2, week: 0, column: 1 },
      { day: '2024-01-16', value: 3, week: 0, column: 2 },
    ],
    maxValue: 3,
    lastUpdated: Timestamp.fromDate(new Date()),
    timeRange: {
      startDate: '2024-01-15',
      endDate: '2024-01-16',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ currentUser: mockUser });
  });

  afterEach(() => {
    // Clean up any remaining listeners
    if (mockOnSnapshot.mock.results.length > 0) {
      const unsubscribe = mockOnSnapshot.mock.results[0].value;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    }
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useServerContributionGrid());

    expect(result.current.loading).toBe(true);
    expect(result.current.postingGrid).toBe(null);
    expect(result.current.commentingGrid).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.maxValue).toBe(0);
  });

  it('should set up Firestore listeners for both grids', () => {
    renderHook(() => useServerContributionGrid());

    expect(mockDoc).toHaveBeenCalledTimes(2);
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      'contributionGrids',
      `${mockUser.uid}_${ActivityType.POSTING}`,
    );
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      'contributionGrids',
      `${mockUser.uid}_${ActivityType.COMMENTING}`,
    );
    expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
  });

  it('should update state when posting grid data is received', async () => {
    let postingCallback: (doc: any) => void;
    let commentingCallback: (doc: any) => void;

    mockOnSnapshot
      .mockImplementationOnce((ref: any, callback: any) => {
        postingCallback = callback;
        return vi.fn(); // unsubscribe function
      })
      .mockImplementationOnce((ref: any, callback: any) => {
        commentingCallback = callback;
        return vi.fn(); // unsubscribe function
      });

    const { result } = renderHook(() => useServerContributionGrid());

    // Simulate posting grid data
    postingCallback!({
      exists: () => true,
      data: () => mockPostingGrid,
    });

    await waitFor(() => {
      expect(result.current.postingGrid).toEqual(mockPostingGrid);
      expect(result.current.maxValue).toBe(150); // posting maxValue
    });
  });

  it('should update state when commenting grid data is received', async () => {
    let postingCallback: (doc: any) => void;
    let commentingCallback: (doc: any) => void;

    mockOnSnapshot
      .mockImplementationOnce((ref: any, callback: any) => {
        postingCallback = callback;
        return vi.fn(); // unsubscribe function
      })
      .mockImplementationOnce((ref: any, callback: any) => {
        commentingCallback = callback;
        return vi.fn(); // unsubscribe function
      });

    const { result } = renderHook(() => useServerContributionGrid());

    // Simulate commenting grid data
    commentingCallback!({
      exists: () => true,
      data: () => mockCommentingGrid,
    });

    await waitFor(() => {
      expect(result.current.commentingGrid).toEqual(mockCommentingGrid);
      expect(result.current.maxValue).toBe(3); // commenting maxValue
    });
  });

  it('should calculate maxValue from both grids', async () => {
    let postingCallback: (doc: any) => void;
    let commentingCallback: (doc: any) => void;

    mockOnSnapshot
      .mockImplementationOnce((ref: any, callback: any) => {
        postingCallback = callback;
        return vi.fn(); // unsubscribe function
      })
      .mockImplementationOnce((ref: any, callback: any) => {
        commentingCallback = callback;
        return vi.fn(); // unsubscribe function
      });

    const { result } = renderHook(() => useServerContributionGrid());

    // Simulate both grids data
    postingCallback!({
      exists: () => true,
      data: () => mockPostingGrid,
    });
    commentingCallback!({
      exists: () => true,
      data: () => mockCommentingGrid,
    });

    await waitFor(() => {
      expect(result.current.maxValue).toBe(150); // max of 150 and 3
    });
  });

  it('should handle non-existent documents', async () => {
    let postingCallback: (doc: any) => void;
    let commentingCallback: (doc: any) => void;

    mockOnSnapshot
      .mockImplementationOnce((ref: any, callback: any) => {
        postingCallback = callback;
        return vi.fn(); // unsubscribe function
      })
      .mockImplementationOnce((ref: any, callback: any) => {
        commentingCallback = callback;
        return vi.fn(); // unsubscribe function
      });

    const { result } = renderHook(() => useServerContributionGrid());

    // Simulate non-existent documents
    postingCallback!({
      exists: () => false,
      data: () => null,
    });
    commentingCallback!({
      exists: () => false,
      data: () => null,
    });

    await waitFor(() => {
      expect(result.current.postingGrid).toBe(null);
      expect(result.current.commentingGrid).toBe(null);
      expect(result.current.maxValue).toBe(0);
    });
  });

  it('should handle errors from Firestore', async () => {
    let postingErrorCallback: (error: Error) => void;
    let commentingErrorCallback: (error: Error) => void;

    mockOnSnapshot
      .mockImplementationOnce((ref: any, callback: any, errorCallback: any) => {
        postingErrorCallback = errorCallback;
        return vi.fn(); // unsubscribe function
      })
      .mockImplementationOnce((ref: any, callback: any, errorCallback: any) => {
        commentingErrorCallback = errorCallback;
        return vi.fn(); // unsubscribe function
      });

    const { result } = renderHook(() => useServerContributionGrid());

    const testError = new Error('Firestore error');

    // Simulate error
    postingErrorCallback!(testError);

    await waitFor(() => {
      expect(result.current.error).toBe(testError);
      expect(result.current.postingGrid).toBe(null);
    });
  });

  it('should handle user not authenticated', () => {
    mockUseAuth.mockReturnValue({ currentUser: null });

    const { result } = renderHook(() => useServerContributionGrid());

    expect(result.current.loading).toBe(false);
    expect(result.current.postingGrid).toBe(null);
    expect(result.current.commentingGrid).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.maxValue).toBe(0);
  });

  it('should cleanup listeners on unmount', () => {
    const unsubscribePosting = vi.fn();
    const unsubscribeCommenting = vi.fn();

    mockOnSnapshot
      .mockReturnValueOnce(unsubscribePosting)
      .mockReturnValueOnce(unsubscribeCommenting);

    const { unmount } = renderHook(() => useServerContributionGrid());

    unmount();

    expect(unsubscribePosting).toHaveBeenCalled();
    expect(unsubscribeCommenting).toHaveBeenCalled();
  });
});
