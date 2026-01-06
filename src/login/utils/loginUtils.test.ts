import { describe, it, expect } from 'vitest';
import {
  formatYearMonth,
  createBoardCacheKey,
  transformBoardWithId,
  isUserInActiveList,
  getLoginRedirectPath,
} from './loginUtils';

describe('loginUtils', () => {
  describe('formatYearMonth', () => {
    it('formats date as YYYY-MM with zero-padded month', () => {
      const january = new Date(2026, 0, 15); // January
      expect(formatYearMonth(january)).toBe('2026-01');
    });

    it('handles months without padding needed', () => {
      const december = new Date(2026, 11, 25); // December
      expect(formatYearMonth(december)).toBe('2026-12');
    });

    it('handles single-digit months correctly', () => {
      const may = new Date(2026, 4, 1); // May (month index 4)
      expect(formatYearMonth(may)).toBe('2026-05');
    });

    it('uses current date when no argument provided', () => {
      const result = formatYearMonth();
      const now = new Date();
      const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');
      expect(result).toBe(`${now.getFullYear()}-${expectedMonth}`);
    });
  });

  describe('createBoardCacheKey', () => {
    it('creates cache key with board ID and year-month', () => {
      const result = createBoardCacheKey('board-123', '2026-01');
      expect(result).toBe('upcomingBoard-board-123-2026-01');
    });

    it('returns null when boardId is null', () => {
      const result = createBoardCacheKey(null, '2026-01');
      expect(result).toBeNull();
    });

    it('returns null when boardId is empty string', () => {
      const result = createBoardCacheKey('', '2026-01');
      expect(result).toBeNull();
    });
  });

  describe('transformBoardWithId', () => {
    const mockBoard = {
      cohort: 10,
      title: '매글프 10기',
      memberIds: ['user1', 'user2'],
      waitingList: [],
      startHour: 0,
      endHour: 24,
    };

    it('adds id to board object when board exists', () => {
      const result = transformBoardWithId(mockBoard as any, 'board-456');
      expect(result).toEqual({ ...mockBoard, id: 'board-456' });
    });

    it('returns null when board is null', () => {
      const result = transformBoardWithId(null, 'board-456');
      expect(result).toBeNull();
    });

    it('preserves all original board properties', () => {
      const result = transformBoardWithId(mockBoard as any, 'board-789');
      expect(result?.cohort).toBe(10);
      expect(result?.title).toBe('매글프 10기');
      expect(result?.memberIds).toEqual(['user1', 'user2']);
    });
  });

  describe('isUserInActiveList', () => {
    const mockUsers = [
      { uid: 'user-1' },
      { uid: 'user-2' },
      { uid: 'user-3' },
    ];

    it('returns true when user is in the list', () => {
      expect(isUserInActiveList(mockUsers, 'user-2')).toBe(true);
    });

    it('returns false when user is not in the list', () => {
      expect(isUserInActiveList(mockUsers, 'user-999')).toBe(false);
    });

    it('returns false when users array is undefined', () => {
      expect(isUserInActiveList(undefined, 'user-1')).toBe(false);
    });

    it('returns false when userId is undefined', () => {
      expect(isUserInActiveList(mockUsers, undefined)).toBe(false);
    });

    it('returns false when both are undefined', () => {
      expect(isUserInActiveList(undefined, undefined)).toBe(false);
    });

    it('returns false when users array is empty', () => {
      expect(isUserInActiveList([], 'user-1')).toBe(false);
    });
  });

  describe('getLoginRedirectPath', () => {
    it('returns /boards for active users', () => {
      expect(getLoginRedirectPath(true)).toBe('/boards');
    });

    it('returns /join/form for new users', () => {
      expect(getLoginRedirectPath(false)).toBe('/join/form');
    });
  });
});
