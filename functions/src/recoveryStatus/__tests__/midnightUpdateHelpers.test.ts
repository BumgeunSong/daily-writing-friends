import { describe, it, expect } from '@jest/globals';
import {
  determineNewRecoveryStatus,
  shouldUpdateStatus,
  createStatusTransitionLog,
  isValidUserRecoveryData,
  filterUsersForProcessing,
  batchUsers,
  extractUserRecoveryData,
  UserRecoveryData
} from '../midnightUpdateHelpers';
import { RecoveryStatus } from '../../types/User';

// Mock test data
const mockUserData: UserRecoveryData = {
  userId: 'user123',
  currentStatus: 'eligible' as RecoveryStatus
};

const mockInvalidUserData: UserRecoveryData = {
  userId: '',
  currentStatus: 'eligible' as RecoveryStatus
};

// Mock Firestore document
const mockFirestoreDoc = {
  id: 'user123',
  data: () => ({
    recoveryStatus: 'eligible'
  })
} as any;

describe('midnightUpdateHelpers', () => {
  describe('extractUserRecoveryData', () => {
    it('should extract user data from Firestore document', () => {
      const result = extractUserRecoveryData(mockFirestoreDoc);
      expect(result).toEqual({
        userId: 'user123',
        currentStatus: 'eligible'
      });
    });

    it('should default to none status when no recovery status in document', () => {
      const docWithoutStatus = {
        id: 'user456',
        data: () => ({})
      } as any;
      
      const result = extractUserRecoveryData(docWithoutStatus);
      expect(result).toEqual({
        userId: 'user456',
        currentStatus: 'none'
      });
    });
  });

  describe('determineNewRecoveryStatus', () => {
    describe('when current status is partial or eligible', () => {
      it('should reset partial status to none when not successful', () => {
        const result = determineNewRecoveryStatus('partial', 'eligible');
        expect(result).toBe('none');
      });

      it('should reset eligible status to none when not successful', () => {
        const result = determineNewRecoveryStatus('eligible', 'partial');
        expect(result).toBe('none');
      });

      it('should keep success status when recovery completed from partial', () => {
        const result = determineNewRecoveryStatus('partial', 'success');
        expect(result).toBe('success');
      });

      it('should keep success status when recovery completed from eligible', () => {
        const result = determineNewRecoveryStatus('eligible', 'success');
        expect(result).toBe('success');
      });
    });

    describe('when current status is none or success', () => {
      it('should use calculated status for none current status', () => {
        const result = determineNewRecoveryStatus('none', 'eligible');
        expect(result).toBe('eligible');
      });

      it('should use calculated status for success current status', () => {
        const result = determineNewRecoveryStatus('success', 'none');
        expect(result).toBe('none');
      });
    });

    describe('edge cases', () => {
      it('should handle none to none transition', () => {
        const result = determineNewRecoveryStatus('none', 'none');
        expect(result).toBe('none');
      });

      it('should handle success to success transition', () => {
        const result = determineNewRecoveryStatus('success', 'success');
        expect(result).toBe('success');
      });
    });
  });

  describe('shouldUpdateStatus', () => {
    it('should return true when status changes', () => {
      const result = shouldUpdateStatus('none', 'eligible');
      expect(result).toBe(true);
    });

    it('should return false when status unchanged', () => {
      const result = shouldUpdateStatus('eligible', 'eligible');
      expect(result).toBe(false);
    });

    it('should return true for all status transitions', () => {
      const transitions = [
        ['none', 'eligible'],
        ['eligible', 'partial'],
        ['partial', 'success'],
        ['success', 'none'],
        ['partial', 'none'],
        ['eligible', 'none']
      ] as const;

      transitions.forEach(([from, to]) => {
        expect(shouldUpdateStatus(from, to)).toBe(true);
      });
    });
  });

  describe('createStatusTransitionLog', () => {
    it('should create reset log for failed recovery from partial', () => {
      const log = createStatusTransitionLog('user123', 'partial', 'none', 'partial');
      expect(log.transitionType).toBe('reset');
      expect(log.message).toContain('failed to complete recovery');
      expect(log.message).toContain('user123');
    });

    it('should create reset log for failed recovery from eligible', () => {
      const log = createStatusTransitionLog('user456', 'eligible', 'none', 'eligible');
      expect(log.transitionType).toBe('reset');
      expect(log.message).toContain('failed to complete recovery');
    });

    it('should create success log for completed recovery', () => {
      const log = createStatusTransitionLog('user123', 'partial', 'success', 'success');
      expect(log.transitionType).toBe('success');
      expect(log.message).toContain('completed recovery successfully');
    });

    it('should create no_change log when status unchanged', () => {
      const log = createStatusTransitionLog('user123', 'none', 'none', 'none');
      expect(log.transitionType).toBe('no_change');
      expect(log.message).toContain('status unchanged');
    });

    it('should create transition log for regular status changes', () => {
      const log = createStatusTransitionLog('user123', 'none', 'eligible', 'eligible');
      expect(log.transitionType).toBe('transition');
      expect(log.message).toContain('none');
      expect(log.message).toContain('eligible');
    });

    it('should include all required fields in log object', () => {
      const log = createStatusTransitionLog('user123', 'partial', 'none', 'partial');
      expect(log).toMatchObject({
        userId: 'user123',
        currentStatus: 'partial',
        newStatus: 'none',
        calculatedStatus: 'partial',
        transitionType: 'reset',
        message: expect.any(String)
      });
    });
  });

  describe('isValidUserRecoveryData', () => {
    it('should validate correct user data', () => {
      const result = isValidUserRecoveryData(mockUserData);
      expect(result).toBe(true);
    });

    it('should reject empty user ID', () => {
      const result = isValidUserRecoveryData(mockInvalidUserData);
      expect(result).toBe(false);
    });

    it('should reject invalid status', () => {
      const invalidData = { userId: 'user123', currentStatus: 'invalid' as any };
      const result = isValidUserRecoveryData(invalidData);
      expect(result).toBe(false);
    });

    it('should validate all valid statuses', () => {
      const validStatuses: RecoveryStatus[] = ['none', 'eligible', 'partial', 'success'];
      
      validStatuses.forEach(status => {
        const userData = { userId: 'user123', currentStatus: status };
        expect(isValidUserRecoveryData(userData)).toBe(true);
      });
    });

    it('should reject null or undefined user ID', () => {
      const nullIdData = { userId: null as any, currentStatus: 'none' as RecoveryStatus };
      const undefinedIdData = { userId: undefined as any, currentStatus: 'none' as RecoveryStatus };
      
      expect(isValidUserRecoveryData(nullIdData)).toBe(false);
      expect(isValidUserRecoveryData(undefinedIdData)).toBe(false);
    });
  });

  describe('filterUsersForProcessing', () => {
    it('should filter out invalid users', () => {
      const users = [mockUserData, mockInvalidUserData];
      const result = filterUsersForProcessing(users);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockUserData);
    });

    it('should return empty array for all invalid users', () => {
      const invalidUsers = [
        { userId: '', currentStatus: 'none' as RecoveryStatus },
        { userId: 'user123', currentStatus: 'invalid' as any }
      ];
      const result = filterUsersForProcessing(invalidUsers);
      expect(result).toHaveLength(0);
    });

    it('should return all users when all are valid', () => {
      const validUsers = [
        { userId: 'user1', currentStatus: 'none' as RecoveryStatus },
        { userId: 'user2', currentStatus: 'eligible' as RecoveryStatus },
        { userId: 'user3', currentStatus: 'partial' as RecoveryStatus }
      ];
      const result = filterUsersForProcessing(validUsers);
      expect(result).toHaveLength(3);
      expect(result).toEqual(validUsers);
    });
  });

  describe('batchUsers', () => {
    it('should create correct batches with exact division', () => {
      const users = [1, 2, 3, 4];
      const batches = batchUsers(users, 2);
      expect(batches).toEqual([[1, 2], [3, 4]]);
    });

    it('should create correct batches with remainder', () => {
      const users = [1, 2, 3, 4, 5];
      const batches = batchUsers(users, 2);
      expect(batches).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle empty array', () => {
      const batches = batchUsers([], 2);
      expect(batches).toEqual([]);
    });

    it('should handle batch size larger than array', () => {
      const users = [1, 2];
      const batches = batchUsers(users, 5);
      expect(batches).toEqual([[1, 2]]);
    });

    it('should handle batch size of 1', () => {
      const users = [1, 2, 3];
      const batches = batchUsers(users, 1);
      expect(batches).toEqual([[1], [2], [3]]);
    });

    it('should maintain correct order within batches', () => {
      const users = ['a', 'b', 'c', 'd', 'e', 'f'];
      const batches = batchUsers(users, 3);
      expect(batches).toEqual([['a', 'b', 'c'], ['d', 'e', 'f']]);
    });
  });
});