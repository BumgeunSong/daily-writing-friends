import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { executeMidnightUpdate } from '../updateRecoveryStatusOnMidnight';

// Mock all the dependencies
jest.mock('../firestoreOperations');
jest.mock('../userRecoveryProcessor');
jest.mock('../../dateUtils');

// Import the mocked modules
import * as firestoreOps from '../firestoreOperations';
import * as userProcessor from '../userRecoveryProcessor';
import * as dateUtils from '../../dateUtils';

// Type the mocked modules
const mockFirestoreOps = firestoreOps as jest.Mocked<typeof firestoreOps>;
const mockUserProcessor = userProcessor as jest.Mocked<typeof userProcessor>;
const mockDateUtils = dateUtils as jest.Mocked<typeof dateUtils>;

describe('executeMidnightUpdate', () => {
  const mockDate = new Date('2025-01-20T00:00:00+09:00');
  const mockSeoulDate = new Date('2025-01-20T00:00:00+09:00');
  const mockDateKey = '2025-01-20';
  
  const mockUsers = [
    { userId: 'user1', currentStatus: 'eligible' as const },
    { userId: 'user2', currentStatus: 'partial' as const }
  ];

  const mockResults = [
    {
      userId: 'user1',
      success: true,
      transitionLog: {
        userId: 'user1',
        currentStatus: 'eligible' as const,
        newStatus: 'none' as const,
        calculatedStatus: 'eligible' as const,
        transitionType: 'reset' as const,
        message: 'User user1 failed to complete recovery - resetting to none'
      }
    },
    {
      userId: 'user2',
      success: true,
      transitionLog: {
        userId: 'user2',
        currentStatus: 'partial' as const,
        newStatus: 'success' as const,
        calculatedStatus: 'success' as const,
        transitionType: 'success' as const,
        message: 'User user2 completed recovery successfully'
      }
    }
  ];

  const mockSummary = {
    totalUsers: 2,
    successfulUpdates: 2,
    errors: 0,
    transitionCounts: {
      reset: 1,
      success: 1,
      transition: 0,
      no_change: 0
    },
    errorDetails: []
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockDateUtils.toSeoulDate.mockReturnValue(mockSeoulDate);
    mockDateUtils.getDateKey.mockReturnValue(mockDateKey);
    mockFirestoreOps.checkFirestoreHealth.mockResolvedValue(true);
    mockFirestoreOps.fetchAndPrepareUsers.mockResolvedValue(mockUsers);
    mockUserProcessor.processUsersInBatches.mockResolvedValue(mockResults);
    mockUserProcessor.generateProcessingSummary.mockReturnValue(mockSummary);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful execution', () => {
    it('should process users and return summary', async () => {
      const result = await executeMidnightUpdate(mockDate, 25);

      expect(result).toEqual(mockSummary);
      expect(mockDateUtils.toSeoulDate).toHaveBeenCalledWith(mockDate);
      expect(mockDateUtils.getDateKey).toHaveBeenCalledWith(mockSeoulDate);
      expect(mockFirestoreOps.checkFirestoreHealth).toHaveBeenCalled();
      expect(mockFirestoreOps.fetchAndPrepareUsers).toHaveBeenCalled();
      expect(mockUserProcessor.processUsersInBatches).toHaveBeenCalledWith(mockUsers, mockSeoulDate, 25);
      expect(mockUserProcessor.generateProcessingSummary).toHaveBeenCalledWith(mockResults);
    });

    it('should use default parameters when not provided', async () => {
      const result = await executeMidnightUpdate();

      expect(result).toEqual(mockSummary);
      expect(mockUserProcessor.processUsersInBatches).toHaveBeenCalledWith(mockUsers, mockSeoulDate, 50);
    });

    it('should handle empty user list', async () => {
      const emptySummary = {
        totalUsers: 0,
        successfulUpdates: 0,
        errors: 0,
        transitionCounts: { reset: 0, success: 0, transition: 0, no_change: 0 },
        errorDetails: []
      };

      mockFirestoreOps.fetchAndPrepareUsers.mockResolvedValue([]);
      mockUserProcessor.generateProcessingSummary.mockReturnValue(emptySummary);

      const result = await executeMidnightUpdate(mockDate);

      expect(result).toEqual(emptySummary);
      expect(mockUserProcessor.processUsersInBatches).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw error when Firestore health check fails', async () => {
      mockFirestoreOps.checkFirestoreHealth.mockResolvedValue(false);

      await expect(executeMidnightUpdate(mockDate)).rejects.toThrow('Firestore connection failed health check');
      
      expect(mockFirestoreOps.fetchAndPrepareUsers).not.toHaveBeenCalled();
    });

    it('should propagate errors from fetchAndPrepareUsers', async () => {
      const error = new Error('Database connection failed');
      mockFirestoreOps.fetchAndPrepareUsers.mockRejectedValue(error);

      await expect(executeMidnightUpdate(mockDate)).rejects.toThrow('Database connection failed');
    });

    it('should propagate errors from processUsersInBatches', async () => {
      const error = new Error('Processing failed');
      mockUserProcessor.processUsersInBatches.mockRejectedValue(error);

      await expect(executeMidnightUpdate(mockDate)).rejects.toThrow('Processing failed');
    });
  });

  describe('logging and monitoring', () => {
    it('should log warning when there are processing errors', async () => {
      const summaryWithErrors = {
        ...mockSummary,
        errors: 2,
        errorDetails: [
          { userId: 'user3', error: 'Network timeout' },
          { userId: 'user4', error: 'Invalid data' }
        ]
      };

      mockUserProcessor.generateProcessingSummary.mockReturnValue(summaryWithErrors);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await executeMidnightUpdate(mockDate);

      expect(result).toEqual(summaryWithErrors);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 users had processing errors:'),
        expect.arrayContaining([
          { userId: 'user3', error: 'Network timeout' },
          { userId: 'user4', error: 'Invalid data' }
        ])
      );

      consoleSpy.mockRestore();
    });

    it('should not log warnings when there are no errors', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await executeMidnightUpdate(mockDate);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('batch size configuration', () => {
    it('should pass custom batch size to processor', async () => {
      await executeMidnightUpdate(mockDate, 10);

      expect(mockUserProcessor.processUsersInBatches).toHaveBeenCalledWith(mockUsers, mockSeoulDate, 10);
    });

    it('should use default batch size of 50', async () => {
      await executeMidnightUpdate(mockDate);

      expect(mockUserProcessor.processUsersInBatches).toHaveBeenCalledWith(mockUsers, mockSeoulDate, 50);
    });
  });
});