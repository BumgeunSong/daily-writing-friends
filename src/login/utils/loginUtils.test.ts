import { describe, it, expect } from 'vitest';
import {
  formatYearMonth,
  createBoardCacheKey,
  transformBoardWithId,
  isUserInActiveList,
  validateSubmitParams,
  createSuccessResult,
  wrapError,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock object for test
      const result = transformBoardWithId(mockBoard as any, 'board-456');
      expect(result).toEqual({ ...mockBoard, id: 'board-456' });
    });

    it('returns null when board is null', () => {
      const result = transformBoardWithId(null, 'board-456');
      expect(result).toBeNull();
    });

    it('preserves all original board properties', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock object for test
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

  describe('validateSubmitParams', () => {
    it('returns isValid true when both params are provided', () => {
      const result = validateSubmitParams('board-123', 'user-456');
      expect(result).toEqual({ isValid: true });
    });

    it('returns error when boardId is missing', () => {
      const result = validateSubmitParams(undefined, 'user-456');
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error.message).toBe('신청 가능한 기수 정보를 찾을 수 없습니다.');
      }
    });

    it('returns error when boardId is empty string', () => {
      const result = validateSubmitParams('', 'user-456');
      expect(result.isValid).toBe(false);
    });

    it('returns error when userId is missing', () => {
      const result = validateSubmitParams('board-123', undefined);
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error.message).toBe('사용자 정보를 찾을 수 없습니다. 로그인 상태를 확인해주세요.');
      }
    });

    it('returns error when userId is empty string', () => {
      const result = validateSubmitParams('board-123', '');
      expect(result.isValid).toBe(false);
    });

    it('checks boardId before userId', () => {
      const result = validateSubmitParams('', '');
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error.message).toBe('신청 가능한 기수 정보를 찾을 수 없습니다.');
      }
    });
  });

  describe('createSuccessResult', () => {
    it('creates success result with provided values', () => {
      const result = createSuccessResult('홍길동', 10);
      expect(result).toEqual({
        success: true,
        name: '홍길동',
        cohort: 10,
      });
    });

    it('defaults name to empty string when undefined', () => {
      const result = createSuccessResult(undefined, 10);
      expect(result.name).toBe('');
    });

    it('defaults cohort to 0 when undefined', () => {
      const result = createSuccessResult('홍길동', undefined);
      expect(result.cohort).toBe(0);
    });

    it('handles both undefined values', () => {
      const result = createSuccessResult(undefined, undefined);
      expect(result).toEqual({
        success: true,
        name: '',
        cohort: 0,
      });
    });
  });

  describe('wrapError', () => {
    it('wraps Error instance preserving message', () => {
      const originalError = new Error('Something went wrong');
      const result = wrapError(originalError);
      expect(result).toEqual({
        success: false,
        error: originalError,
      });
    });

    it('wraps string error with generic message', () => {
      const result = wrapError('string error');
      expect(result.success).toBe(false);
      expect(result.error.message).toBe('알 수 없는 오류가 발생했습니다.');
    });

    it('wraps null with generic message', () => {
      const result = wrapError(null);
      expect(result.success).toBe(false);
      expect(result.error.message).toBe('알 수 없는 오류가 발생했습니다.');
    });

    it('wraps undefined with generic message', () => {
      const result = wrapError(undefined);
      expect(result.success).toBe(false);
      expect(result.error.message).toBe('알 수 없는 오류가 발생했습니다.');
    });

    it('wraps object with generic message', () => {
      const result = wrapError({ code: 'ERR_001' });
      expect(result.success).toBe(false);
      expect(result.error.message).toBe('알 수 없는 오류가 발생했습니다.');
    });
  });
});
