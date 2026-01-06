import { describe, it, expect, vi, beforeEach } from 'vitest';
import { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { submitNewUserJoin } from '../JoinFormPageForNewUser';
import { Board } from '@/board/model/Board';
import { JoinFormDataForNewUser } from '@/login/model/join';

// Mock dependencies
vi.mock('@/user/api/user', () => ({
  updateUser: vi.fn(),
  createUserIfNotExists: vi.fn(),
}));

vi.mock('@/shared/utils/boardUtils', () => ({
  addUserToBoardWaitingList: vi.fn(),
}));

import { updateUser, createUserIfNotExists } from '@/user/api/user';
import { addUserToBoardWaitingList } from '@/shared/utils/boardUtils';

const mockUpdateUser = vi.mocked(updateUser);
const mockCreateUserIfNotExists = vi.mocked(createUserIfNotExists);
const mockAddUserToBoardWaitingList = vi.mocked(addUserToBoardWaitingList);

describe('submitNewUserJoin', () => {
  const mockFormData: JoinFormDataForNewUser = {
    name: '홍길동',
    nickname: '길동이',
    phoneNumber: '010-1234-5678',
    referrer: '친구 소개',
  };

  const mockUpcomingBoard: Board = {
    id: 'board-123',
    cohort: 10,
    firstDay: Timestamp.fromDate(new Date('2026-02-01')),
    lastDay: Timestamp.fromDate(new Date('2026-02-28')),
    title: '매글프 10기',
    startHour: 0,
    endHour: 24,
    memberIds: [],
    waitingList: [],
  };

  const mockCurrentUser = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  } as FirebaseUser;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when all required params are valid', () => {
    it('creates user, updates info, and adds to waiting list', async () => {
      mockCreateUserIfNotExists.mockResolvedValue(undefined);
      mockUpdateUser.mockResolvedValue(undefined);
      mockAddUserToBoardWaitingList.mockResolvedValue(true);

      const result = await submitNewUserJoin({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        currentUser: mockCurrentUser,
      });

      expect(mockCreateUserIfNotExists).toHaveBeenCalledWith(mockCurrentUser);
      expect(mockUpdateUser).toHaveBeenCalledWith('user-123', {
        realName: '홍길동',
        phoneNumber: '010-1234-5678',
        nickname: '길동이',
        referrer: '친구 소개',
      });
      expect(mockAddUserToBoardWaitingList).toHaveBeenCalledWith('board-123', 'user-123');
      expect(result.success).toBe(true);
    });

    it('returns success with user info', async () => {
      mockCreateUserIfNotExists.mockResolvedValue(undefined);
      mockUpdateUser.mockResolvedValue(undefined);
      mockAddUserToBoardWaitingList.mockResolvedValue(true);

      const result = await submitNewUserJoin({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        currentUser: mockCurrentUser,
      });

      expect(result).toEqual({
        success: true,
        name: '홍길동',
        cohort: 10,
      });
    });
  });

  describe('when boardId is missing', () => {
    it('returns error with descriptive message', async () => {
      const boardWithoutId = { ...mockUpcomingBoard, id: '' };

      const result = await submitNewUserJoin({
        data: mockFormData,
        upcomingBoard: boardWithoutId,
        currentUser: mockCurrentUser,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('신청 가능한 기수 정보를 찾을 수 없습니다.');
      }
      expect(mockCreateUserIfNotExists).not.toHaveBeenCalled();
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockAddUserToBoardWaitingList).not.toHaveBeenCalled();
    });
  });

  describe('when userId is missing', () => {
    it('returns error with descriptive message', async () => {
      const userWithoutUid = { ...mockCurrentUser, uid: '' } as FirebaseUser;

      const result = await submitNewUserJoin({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        currentUser: userWithoutUid,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('사용자 정보를 찾을 수 없습니다. 로그인 상태를 확인해주세요.');
      }
    });
  });

  describe('when createUserIfNotExists fails', () => {
    it('returns error', async () => {
      mockCreateUserIfNotExists.mockRejectedValue(new Error('Failed to create user'));

      const result = await submitNewUserJoin({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        currentUser: mockCurrentUser,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Failed to create user');
      }
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockAddUserToBoardWaitingList).not.toHaveBeenCalled();
    });
  });

  describe('when updateUser fails', () => {
    it('returns error', async () => {
      mockCreateUserIfNotExists.mockResolvedValue(undefined);
      mockUpdateUser.mockRejectedValue(new Error('Failed to update user'));

      const result = await submitNewUserJoin({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        currentUser: mockCurrentUser,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Failed to update user');
      }
      expect(mockAddUserToBoardWaitingList).not.toHaveBeenCalled();
    });
  });

  describe('when addUserToBoardWaitingList fails', () => {
    it('returns error after user is created and updated', async () => {
      mockCreateUserIfNotExists.mockResolvedValue(undefined);
      mockUpdateUser.mockResolvedValue(undefined);
      mockAddUserToBoardWaitingList.mockResolvedValue(false);

      const result = await submitNewUserJoin({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        currentUser: mockCurrentUser,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('대기자 명단에 추가하는 중 오류가 발생했습니다.');
      }
      expect(mockCreateUserIfNotExists).toHaveBeenCalled();
      expect(mockUpdateUser).toHaveBeenCalled();
    });
  });

  describe('when an unexpected error occurs', () => {
    it('catches and wraps the error', async () => {
      mockCreateUserIfNotExists.mockResolvedValue(undefined);
      mockUpdateUser.mockResolvedValue(undefined);
      mockAddUserToBoardWaitingList.mockRejectedValue(new Error('Network error'));

      const result = await submitNewUserJoin({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        currentUser: mockCurrentUser,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Network error');
      }
    });

    it('wraps non-Error exceptions', async () => {
      mockCreateUserIfNotExists.mockRejectedValue('string error');

      const result = await submitNewUserJoin({
        data: mockFormData,
        upcomingBoard: mockUpcomingBoard,
        currentUser: mockCurrentUser,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('알 수 없는 오류가 발생했습니다.');
      }
    });
  });

  describe('when cohort is undefined', () => {
    it('returns 0 for cohort', async () => {
      mockCreateUserIfNotExists.mockResolvedValue(undefined);
      mockUpdateUser.mockResolvedValue(undefined);
      mockAddUserToBoardWaitingList.mockResolvedValue(true);
      const boardWithoutCohort = { ...mockUpcomingBoard, cohort: undefined } as unknown as Board;

      const result = await submitNewUserJoin({
        data: mockFormData,
        upcomingBoard: boardWithoutCohort,
        currentUser: mockCurrentUser,
      });

      expect(result).toEqual({
        success: true,
        name: '홍길동',
        cohort: 0,
      });
    });
  });

  describe('with optional fields', () => {
    it('handles missing optional fields', async () => {
      mockCreateUserIfNotExists.mockResolvedValue(undefined);
      mockUpdateUser.mockResolvedValue(undefined);
      mockAddUserToBoardWaitingList.mockResolvedValue(true);

      const minimalFormData: JoinFormDataForNewUser = {
        name: '홍길동',
        nickname: '길동이',
        phoneNumber: undefined,
        referrer: undefined,
      };

      const result = await submitNewUserJoin({
        data: minimalFormData,
        upcomingBoard: mockUpcomingBoard,
        currentUser: mockCurrentUser,
      });

      expect(mockUpdateUser).toHaveBeenCalledWith('user-123', {
        realName: '홍길동',
        phoneNumber: undefined,
        nickname: '길동이',
        referrer: undefined,
      });
      expect(result.success).toBe(true);
    });
  });
});
