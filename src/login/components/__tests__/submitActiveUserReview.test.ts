import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Board } from '@/board/model/Board';
import { JoinFormDataForActiveUser } from '@/login/model/join';

// Mock Firebase before any imports that use it
vi.mock('@/firebase', () => ({
  firestore: {},
  auth: {},
}));

vi.mock('firebase/firestore', () => ({
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date }),
    now: () => ({ toDate: () => new Date() }),
  },
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

// Mock dependencies
vi.mock('@/shared/utils/reviewUtils', () => ({
  addReviewToBoard: vi.fn(),
}));

vi.mock('@/shared/utils/boardUtils', () => ({
  addUserToBoardWaitingList: vi.fn(),
}));

import { addReviewToBoard } from '@/shared/utils/reviewUtils';
import { addUserToBoardWaitingList } from '@/shared/utils/boardUtils';
import { submitActiveUserReview } from '../JoinFormPageForActiveUser';

const mockAddReviewToBoard = vi.mocked(addReviewToBoard);
const mockAddUserToBoardWaitingList = vi.mocked(addUserToBoardWaitingList);

describe('submitActiveUserReview', () => {
  const mockFormData: JoinFormDataForActiveUser = {
    keep: '좋았던 점',
    problem: '어려웠던 점',
    try: '개선 아이디어',
    nps: 8,
    willContinue: 'yes',
  };

  const mockUpcomingBoard: Board = {
    id: 'board-123',
    cohort: 10,
    firstDay: { toDate: () => new Date('2026-02-01') } as any,
    lastDay: { toDate: () => new Date('2026-02-28') } as any,
    title: '매글프 10기',
    startHour: 0,
    endHour: 24,
    memberIds: [],
    waitingList: [],
  };

  const mockUserId = 'user-123';
  const mockNickname = '테스트유저';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when all required params are valid', () => {
    it('creates review and adds user to waiting list', async () => {
      mockAddReviewToBoard.mockResolvedValue(true);
      mockAddUserToBoardWaitingList.mockResolvedValue(true);

      const result = await submitActiveUserReview({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        userId: mockUserId,
        nickname: mockNickname,
      });

      expect(mockAddReviewToBoard).toHaveBeenCalledWith(
        'board-123',
        'user-123',
        '테스트유저',
        mockFormData
      );
      expect(mockAddUserToBoardWaitingList).toHaveBeenCalledWith('board-123', 'user-123');
      expect(result.success).toBe(true);
    });

    it('returns success with user info', async () => {
      mockAddReviewToBoard.mockResolvedValue(true);
      mockAddUserToBoardWaitingList.mockResolvedValue(true);

      const result = await submitActiveUserReview({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        userId: mockUserId,
        nickname: mockNickname,
      });

      expect(result).toEqual({
        success: true,
        name: mockNickname,
        cohort: 10,
      });
    });

    it('returns empty string for name when nickname is undefined', async () => {
      mockAddReviewToBoard.mockResolvedValue(true);
      mockAddUserToBoardWaitingList.mockResolvedValue(true);

      const result = await submitActiveUserReview({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        userId: mockUserId,
        nickname: undefined,
      });

      expect(result).toEqual({
        success: true,
        name: '',
        cohort: 10,
      });
    });
  });

  describe('when boardId is missing', () => {
    it('returns error with descriptive message', async () => {
      const boardWithoutId = { ...mockUpcomingBoard, id: '' };

      const result = await submitActiveUserReview({
        data: mockFormData,
        upcomingBoard: boardWithoutId,
        userId: mockUserId,
        nickname: mockNickname,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('신청 가능한 기수 정보를 찾을 수 없습니다.');
      }
      expect(mockAddReviewToBoard).not.toHaveBeenCalled();
      expect(mockAddUserToBoardWaitingList).not.toHaveBeenCalled();
    });
  });

  describe('when userId is missing', () => {
    it('returns error with descriptive message', async () => {
      const result = await submitActiveUserReview({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        userId: '',
        nickname: mockNickname,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('사용자 정보를 찾을 수 없습니다. 로그인 상태를 확인해주세요.');
      }
      expect(mockAddReviewToBoard).not.toHaveBeenCalled();
      expect(mockAddUserToBoardWaitingList).not.toHaveBeenCalled();
    });
  });

  describe('when addReviewToBoard fails', () => {
    it('returns error and does not add to waiting list', async () => {
      mockAddReviewToBoard.mockResolvedValue(false);

      const result = await submitActiveUserReview({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        userId: mockUserId,
        nickname: mockNickname,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('리뷰 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
      expect(mockAddUserToBoardWaitingList).not.toHaveBeenCalled();
    });
  });

  describe('when addUserToBoardWaitingList fails', () => {
    it('returns error after review is created', async () => {
      mockAddReviewToBoard.mockResolvedValue(true);
      mockAddUserToBoardWaitingList.mockResolvedValue(false);

      const result = await submitActiveUserReview({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        userId: mockUserId,
        nickname: mockNickname,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('대기자 명단에 추가하는 중 오류가 발생했습니다.');
      }
      expect(mockAddReviewToBoard).toHaveBeenCalled();
    });
  });

  describe('when an unexpected error occurs', () => {
    it('catches and wraps the error', async () => {
      mockAddReviewToBoard.mockRejectedValue(new Error('Network error'));

      const result = await submitActiveUserReview({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        userId: mockUserId,
        nickname: mockNickname,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Network error');
      }
    });

    it('wraps non-Error exceptions', async () => {
      mockAddReviewToBoard.mockRejectedValue('string error');

      const result = await submitActiveUserReview({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        userId: mockUserId,
        nickname: mockNickname,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('알 수 없는 오류가 발생했습니다.');
      }
    });
  });

  describe('when cohort is undefined', () => {
    it('returns 0 for cohort', async () => {
      mockAddReviewToBoard.mockResolvedValue(true);
      mockAddUserToBoardWaitingList.mockResolvedValue(true);
      const boardWithoutCohort = { ...mockUpcomingBoard, cohort: undefined } as unknown as Board;

      const result = await submitActiveUserReview({
        data: mockFormData,
        upcomingBoard: boardWithoutCohort,
        userId: mockUserId,
        nickname: mockNickname,
      });

      expect(result).toEqual({
        success: true,
        name: mockNickname,
        cohort: 0,
      });
    });
  });
});
