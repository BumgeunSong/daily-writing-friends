import { describe, it, expect, beforeEach } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import {
  calculateOnStreakToEligiblePure,
  calculateEligibleToOnStreakPure,
  calculateEligibleToMissedPure,
  calculateMissedToOnStreakPure,
} from '../stateTransitions';
import { RecoveryStatusType, StreakInfo } from '../StreakInfo';

describe('Streak Recovery State Transitions', () => {
  const userId = 'testUser123';
  
  // Test data helpers
  const createStreakInfo = (overrides: Partial<StreakInfo> = {}): StreakInfo => ({
    lastContributionDate: '2024-01-15',
    lastCalculated: Timestamp.now(),
    status: { type: RecoveryStatusType.ON_STREAK },
    currentStreak: 5,
    longestStreak: 10,
    originalStreak: 5,
    ...overrides,
  });

  beforeEach(() => {
    // No mocks needed - testing pure functions with real return values
  });

  describe('when user misses working day', () => {
    describe('when missing Monday through Thursday', () => {
      it('enters recovery mode requiring 2 posts by next working day', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z'); // Wednesday
        const streakInfo = createStreakInfo({ currentStreak: 7, originalStreak: 7 });
        const hadPostsYesterday = false; // Missed Tuesday
        
        const result = calculateOnStreakToEligiblePure(userId, wednesdayDate, streakInfo, hadPostsYesterday);
        
        expect(result?.updates.status).toEqual({
          type: RecoveryStatusType.ELIGIBLE,
          postsRequired: 2,
          currentPosts: 0,
          deadline: expect.any(Timestamp),
          missedDate: expect.any(Timestamp),
        });
      });
      
      it('captures original streak and resets current streak', () => {
        const thursdayDate = new Date('2024-01-18T10:00:00Z'); // Thursday
        const streakInfo = createStreakInfo({ currentStreak: 3, originalStreak: 3 });
        const hadPostsYesterday = false; // Missed Wednesday
        
        const result = calculateOnStreakToEligiblePure(userId, thursdayDate, streakInfo, hadPostsYesterday);
        
        expect(result?.updates.currentStreak).toBe(0);
        expect(result?.updates.originalStreak).toBe(3);
      });
    });
    
    describe('when missing Friday', () => {
      it('enters recovery mode requiring 1 post by Saturday only', () => {
        const saturdayDate = new Date('2024-01-20T10:00:00Z'); // Saturday
        const streakInfo = createStreakInfo({ currentStreak: 4, originalStreak: 4 });
        const hadPostsYesterday = false; // Missed Friday
        
        const result = calculateOnStreakToEligiblePure(userId, saturdayDate, streakInfo, hadPostsYesterday);
        
        expect(result?.updates.status).toEqual({
          type: RecoveryStatusType.ELIGIBLE,
          postsRequired: 1, // Friday miss only needs 1 post
          currentPosts: 0,
          deadline: expect.any(Timestamp),
          missedDate: expect.any(Timestamp),
        });
      });
    });
    
    describe('when user posted on previous working day', () => {
      it('maintains current streak status', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z'); // Wednesday
        const streakInfo = createStreakInfo();
        const hadPostsYesterday = true; // Posted on Tuesday
        
        const result = calculateOnStreakToEligiblePure(userId, wednesdayDate, streakInfo, hadPostsYesterday);

        expect(result).toBeNull();
      });
    });
    
    describe('when previous day was not a working day', () => {
      it('maintains current streak status regardless of posting', () => {
        const mondayDate = new Date('2024-01-15T12:00:00Z'); // Monday
        const streakInfo = createStreakInfo();
        const hadPostsYesterday = false; // No posts on Sunday
        
        const result = calculateOnStreakToEligiblePure(userId, mondayDate, streakInfo, hadPostsYesterday);
        
        // Non-working day misses don't trigger recovery
        expect(result).toBeNull();
      });
    });
  });

  describe('when user attempts recovery', () => {
    describe('when posting during recovery window', () => {
      it('tracks partial progress when requirement not met', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z'); // Wednesday
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 0,
            deadline: Timestamp.fromDate(wednesdayDate),
            missedDate: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
          currentStreak: 0,
          originalStreak: 5,
        });

        const todayPostCount = 1; // Only 1 out of 2 required posts
        const result = calculateEligibleToOnStreakPure(userId, wednesdayDate, streakInfo, todayPostCount);

        expect(result?.updates.status).toEqual(expect.objectContaining({
          type: RecoveryStatusType.ELIGIBLE,
          currentPosts: 1,
          postsRequired: 2,
        }));
      });

      it('completes recovery and restores streak for working day recovery', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z'); // Wednesday
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 1,
            deadline: Timestamp.fromDate(wednesdayDate),
            missedDate: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
          currentStreak: 0,
          originalStreak: 5,
        });

        const todayPostCount = 2; // Met 2-post requirement
        const result = calculateEligibleToOnStreakPure(userId, wednesdayDate, streakInfo, todayPostCount);

        expect(result?.updates.status).toEqual({ type: RecoveryStatusType.ON_STREAK });
        expect(result?.updates.currentStreak).toBe(6); // originalStreak + 1
        expect(result?.updates.originalStreak).toBe(6); // originalStreak + 1
      });

      it('completes recovery without bonus for weekend recovery', () => {
        const saturdayDate = new Date('2024-01-20T10:00:00Z'); // Saturday
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 1,
            currentPosts: 0,
            deadline: Timestamp.fromDate(new Date('2024-01-22T23:59:59Z')),
            missedDate: Timestamp.fromDate(new Date('2024-01-19T10:00:00Z')), // Friday
          },
          currentStreak: 0,
          originalStreak: 5,
        });

        const todayPostCount = 1; // Met 1-post requirement
        const result = calculateEligibleToOnStreakPure(userId, saturdayDate, streakInfo, todayPostCount);

        expect(result?.updates.status).toEqual({ type: RecoveryStatusType.ON_STREAK });
        expect(result?.updates.currentStreak).toBe(5); // originalStreak (no bonus)
        expect(result?.updates.originalStreak).toBe(5); // unchanged
      });
    });
  });

  describe('when user builds new streak after missed', () => {
    describe('when posting same day after missed', () => {
      it('allows immediate recovery with 2 posts same day', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z'); // Wednesday
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 1, // First post already made
            deadline: Timestamp.fromDate(wednesdayDate),
            missedDate: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
          currentStreak: 0,
          originalStreak: 3,
        });

        const todayPostCount = 2; // Second post completes requirement
        const result = calculateEligibleToOnStreakPure(userId, wednesdayDate, streakInfo, todayPostCount);
        
        expect(result?.updates.status).toEqual({ type: RecoveryStatusType.ON_STREAK });
        expect(result?.updates.currentStreak).toBe(4); // originalStreak + 1
      });
    });
  });

  describe('when recovery requirements vary by day type', () => {
    it('requires different post counts based on missed day', () => {
      // Test weekday recovery - requires 2 posts
      const thursdayDate = new Date('2024-01-18T10:00:00Z'); // Thursday
      const weekdayStreakInfo = createStreakInfo({ currentStreak: 8, originalStreak: 8 });
      const weekdayResult = calculateOnStreakToEligiblePure(userId, thursdayDate, weekdayStreakInfo, false);
      
      expect(weekdayResult?.updates.status?.postsRequired).toBe(2);
      
      // Test Friday miss recovery - requires 1 post
      const saturdayDate = new Date('2024-01-20T10:00:00Z'); // Saturday
      const fridayStreakInfo = createStreakInfo({ currentStreak: 6, originalStreak: 6 });
      const fridayResult = calculateOnStreakToEligiblePure(userId, saturdayDate, fridayStreakInfo, false);
      
      expect(fridayResult?.updates.status?.postsRequired).toBe(1);
    });
    
    it('calculates different streak increments by recovery type', () => {
      // Working day recovery: both streaks increment
      const wednesdayDate = new Date('2024-01-17T10:00:00Z');
      const workingDayStreakInfo = createStreakInfo({
        status: {
          type: RecoveryStatusType.ELIGIBLE,
          postsRequired: 2,
          currentPosts: 1,
          deadline: Timestamp.fromDate(wednesdayDate),
          missedDate: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
        },
        currentStreak: 0,
        originalStreak: 7,
      });
      
      const workingDayResult = calculateEligibleToOnStreakPure(userId, wednesdayDate, workingDayStreakInfo, 2);
      expect(workingDayResult?.updates.currentStreak).toBe(8); // originalStreak + 1
      expect(workingDayResult?.updates.originalStreak).toBe(8); // originalStreak + 1
      
      // Weekend recovery: no increment to originalStreak
      const saturdayDate = new Date('2024-01-20T10:00:00Z');
      const weekendStreakInfo = createStreakInfo({
        status: {
          type: RecoveryStatusType.ELIGIBLE,
          postsRequired: 1,
          currentPosts: 0,
          deadline: Timestamp.fromDate(new Date('2024-01-22T23:59:59Z')),
          missedDate: Timestamp.fromDate(new Date('2024-01-19T10:00:00Z')),
        },
        currentStreak: 0,
        originalStreak: 9,
      });
      
      const weekendResult = calculateEligibleToOnStreakPure(userId, saturdayDate, weekendStreakInfo, 1);
      expect(weekendResult?.updates.currentStreak).toBe(9); // originalStreak (no increment)
      expect(weekendResult?.updates.originalStreak).toBe(9); // unchanged
    });
  });

  describe('edge cases', () => {
    describe('when user is not in expected state', () => {
      it('returns null for onStreak transition when user is not onStreak', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z');
        const streakInfo = createStreakInfo({ status: { type: RecoveryStatusType.MISSED } });
        const hadPostsYesterday = false;
        
        const result = calculateOnStreakToEligiblePure(userId, wednesdayDate, streakInfo, hadPostsYesterday);
        
        expect(result).toBeNull();
      });
      
      it('returns null for eligible transition when user is not eligible', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z');
        const streakInfo = createStreakInfo({ status: { type: RecoveryStatusType.ON_STREAK } });
        const todayPostCount = 2;
        
        const result = calculateEligibleToOnStreakPure(userId, wednesdayDate, streakInfo, todayPostCount);
        
        expect(result).toBeNull();
      });
    });

    describe('when recovery status is missing required fields', () => {
      it('returns null for eligible transition when postsRequired is missing', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z');
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            // Missing postsRequired
            currentPosts: 0,
            deadline: Timestamp.fromDate(wednesdayDate),
            missedDate: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
        });
        const todayPostCount = 2;
        
        const result = calculateEligibleToOnStreakPure(userId, wednesdayDate, streakInfo, todayPostCount);
        
        expect(result).toBeNull();
      });
    });

    describe('when input validation fails', () => {
      it('returns null when streak info is null', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z');
        
        const result = calculateOnStreakToEligiblePure(userId, wednesdayDate, null, false);
        
        expect(result).toBeNull();
      });
    });
  });

  describe('when recovery deadline passes', () => {
    describe('when deadline passes with partial progress', () => {
      it('transitions to missed status and preserves partial progress', () => {
        const thursdayDate = new Date('2024-01-18T10:00:00Z'); // Thursday
        const wednesdayDeadline = new Date('2024-01-17T23:59:59Z'); // Wednesday deadline (passed)
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 1, // Made 1 out of 2 required posts
            deadline: Timestamp.fromDate(wednesdayDeadline),
            missedDate: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
          currentStreak: 1, // Partial progress from 1 post
          originalStreak: 5,
        });

        const result = calculateEligibleToMissedPure(userId, thursdayDate, streakInfo);

        expect(result?.updates.status).toEqual({ type: RecoveryStatusType.MISSED });
        expect(result?.updates.currentStreak).toBe(1); // Preserve partial progress
        expect(result?.updates.originalStreak).toBe(0); // Clear original streak
      });
    });

    describe('when deadline passes with no progress', () => {
      it('transitions to missed status with zero streak', () => {
        const fridayDate = new Date('2024-01-19T10:00:00Z'); // Friday
        const thursdayDeadline = new Date('2024-01-18T23:59:59Z'); // Thursday deadline (passed)
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 0, // Made 0 out of 2 required posts
            deadline: Timestamp.fromDate(thursdayDeadline),
            missedDate: Timestamp.fromDate(new Date('2024-01-17T10:00:00Z')),
          },
          currentStreak: 0,
          originalStreak: 7,
        });

        const result = calculateEligibleToMissedPure(userId, fridayDate, streakInfo);

        expect(result?.updates.status).toEqual({ type: RecoveryStatusType.MISSED });
        expect(result?.updates.currentStreak).toBe(0);
        expect(result?.updates.originalStreak).toBe(0);
      });
    });

    describe('when deadline has not passed', () => {
      it('returns null to maintain eligible status', () => {
        const wednesdayDate = new Date('2024-01-17T12:00:00Z'); // Wednesday noon
        const wednesdayDeadline = new Date('2024-01-17T23:59:59Z'); // Wednesday end (not passed yet)
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 1,
            deadline: Timestamp.fromDate(wednesdayDeadline),
            missedDate: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
          currentStreak: 1,
          originalStreak: 5,
        });

        const result = calculateEligibleToMissedPure(userId, wednesdayDate, streakInfo);

        expect(result).toBeNull();
      });
    });
  });

  describe('when building new streak after missed', () => {
    describe('when posting after missed status', () => {
      it('transitions missed to eligible on first post', () => {
        const thursdayDate = new Date('2024-01-18T10:00:00Z'); // Thursday
        const streakInfo = createStreakInfo({
          status: { type: RecoveryStatusType.MISSED },
          currentStreak: 1, // Had partial progress from previous attempt
          originalStreak: 0,
        });

        const todayPostCount = 1; // First post after missed
        const result = calculateMissedToOnStreakPure(userId, thursdayDate, streakInfo, todayPostCount);

        expect(result?.updates.status).toEqual(expect.objectContaining({
          type: RecoveryStatusType.ELIGIBLE,
          currentPosts: 1,
          postsRequired: 2, // Working day recovery
        }));
        expect(result?.updates.currentStreak).toBe(2); // Incremented from 1+1
      });

      it('completes same-day recovery with second post', () => {
        const thursdayDate = new Date('2024-01-18T10:00:00Z'); // Thursday
        const streakInfo = createStreakInfo({
          status: { type: RecoveryStatusType.MISSED },
          currentStreak: 0,
          originalStreak: 0,
        });

        const todayPostCount = 2; // Two posts same day after missed
        const result = calculateMissedToOnStreakPure(userId, thursdayDate, streakInfo, todayPostCount);

        expect(result?.updates.status).toEqual({ type: RecoveryStatusType.ON_STREAK });
        expect(result?.updates.currentStreak).toBe(2); // Fresh start with 2 posts
      });
    });

    describe('when building streak across multiple days', () => {
      it('transitions to onStreak when currentStreak reaches 2', () => {
        const saturdayDate = new Date('2024-01-20T10:00:00Z'); // Saturday
        const streakInfo = createStreakInfo({
          status: { type: RecoveryStatusType.MISSED },
          currentStreak: 1, // Had 1 from yesterday
          originalStreak: 0,
        });

        const todayPostCount = 1; // One more post
        const result = calculateMissedToOnStreakPure(userId, saturdayDate, streakInfo, todayPostCount);

        expect(result?.updates.status).toEqual({ type: RecoveryStatusType.ON_STREAK });
        expect(result?.updates.currentStreak).toBe(2); // currentStreak ≥ 2 triggers onStreak
      });

      it('remains missed when currentStreak is still below 2', () => {
        const fridayDate = new Date('2024-01-19T10:00:00Z'); // Friday
        const streakInfo = createStreakInfo({
          status: { type: RecoveryStatusType.MISSED },
          currentStreak: 0,
          originalStreak: 0,
        });

        const todayPostCount = 1; // Only one post
        const result = calculateMissedToOnStreakPure(userId, fridayDate, streakInfo, todayPostCount);

        expect(result?.updates.status).toEqual({ type: RecoveryStatusType.MISSED });
        expect(result?.updates.currentStreak).toBe(1); // Still building
      });
    });
  });

  describe('return value structure validation', () => {
    it('returns properly structured DBUpdate object for valid transitions', () => {
      const wednesdayDate = new Date('2024-01-17T10:00:00Z');
      const streakInfo = createStreakInfo();
      const hadPostsYesterday = false;
      
      const result = calculateOnStreakToEligiblePure(userId, wednesdayDate, streakInfo, hadPostsYesterday);
      
      expect(result).toHaveProperty('userId', userId);
      expect(result).toHaveProperty('updates');
      expect(result).toHaveProperty('reason');
      expect(result?.updates).toHaveProperty('lastCalculated');
      expect(result?.updates).toHaveProperty('status');
      expect(result?.updates).toHaveProperty('currentStreak');
      expect(result?.updates).toHaveProperty('originalStreak');
    });
    
    it('includes lastContributionDate in recovery completion', () => {
      const wednesdayDate = new Date('2024-01-17T10:00:00Z');
      const streakInfo = createStreakInfo({
        status: {
          type: RecoveryStatusType.ELIGIBLE,
          postsRequired: 2,
          currentPosts: 1,
          deadline: Timestamp.fromDate(wednesdayDate),
          missedDate: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
        },
        currentStreak: 0,
        originalStreak: 3,
      });

      const todayPostCount = 2;
      const result = calculateEligibleToOnStreakPure(userId, wednesdayDate, streakInfo, todayPostCount);
      
      expect(result?.updates).toHaveProperty('lastContributionDate');
      expect(typeof result?.updates.lastContributionDate).toBe('string');
    });
  });

  describe('when recovery completes successfully (REQ-014)', () => {
    describe('when eligible transitions to onStreak', () => {
      it('creates RecoveryHistory record for working day recovery', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z'); // Wednesday
        const missedTuesday = new Date('2024-01-16T10:00:00Z'); // Tuesday
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 1,
            deadline: Timestamp.fromDate(wednesdayDate),
            missedDate: Timestamp.fromDate(missedTuesday),
          },
          currentStreak: 0,
          originalStreak: 5,
        });

        const todayPostCount = 2; // Completed recovery requirement
        const result = calculateEligibleToOnStreakPure(userId, wednesdayDate, streakInfo, todayPostCount);
        
        // Should include RecoveryHistory record
        expect(result?.updates).toHaveProperty('recoveryHistory');
        expect(result?.updates.recoveryHistory).toEqual({
          missedDate: Timestamp.fromDate(missedTuesday),
          recoveryDate: Timestamp.fromDate(wednesdayDate),
          postsRequired: 2,
          postsWritten: 2,
          recoveredAt: expect.any(Timestamp),
        });
      });

      it('creates RecoveryHistory record for weekend recovery', () => {
        const saturdayDate = new Date('2024-01-20T10:00:00Z'); // Saturday
        const missedFriday = new Date('2024-01-19T10:00:00Z'); // Friday
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 1,
            currentPosts: 0,
            deadline: Timestamp.fromDate(new Date('2024-01-22T23:59:59Z')),
            missedDate: Timestamp.fromDate(missedFriday),
          },
          currentStreak: 0,
          originalStreak: 7,
        });

        const todayPostCount = 1; // Completed recovery requirement 
        const result = calculateEligibleToOnStreakPure(userId, saturdayDate, streakInfo, todayPostCount);
        
        // Should include RecoveryHistory record
        expect(result?.updates).toHaveProperty('recoveryHistory');
        expect(result?.updates.recoveryHistory).toEqual({
          missedDate: Timestamp.fromDate(missedFriday),
          recoveryDate: Timestamp.fromDate(saturdayDate),
          postsRequired: 1,
          postsWritten: 1,
          recoveredAt: expect.any(Timestamp),
        });
      });

      it('does not create RecoveryHistory for partial progress', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z'); // Wednesday
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 0,
            deadline: Timestamp.fromDate(wednesdayDate),
            missedDate: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
          currentStreak: 0,
          originalStreak: 5,
        });

        const todayPostCount = 1; // Only partial progress (1 out of 2 required)
        const result = calculateEligibleToOnStreakPure(userId, wednesdayDate, streakInfo, todayPostCount);
        
        // Should NOT include RecoveryHistory record
        expect(result?.updates).not.toHaveProperty('recoveryHistory');
        expect(result?.updates.status?.type).toBe(RecoveryStatusType.ELIGIBLE);
      });
    });

    describe('when missed transitions to onStreak via same-day path', () => {
      it('creates RecoveryHistory record for same-day two-post recovery', () => {
        const thursdayDate = new Date('2024-01-18T10:00:00Z'); // Thursday
        const streakInfo = createStreakInfo({
          status: { type: RecoveryStatusType.MISSED },
          currentStreak: 0,
          originalStreak: 0,
        });

        const todayPostCount = 2; // Two posts same day
        const result = calculateMissedToOnStreakPure(userId, thursdayDate, streakInfo, todayPostCount);
        
        // Should include RecoveryHistory record
        expect(result?.updates).toHaveProperty('recoveryHistory');
        expect(result?.updates.recoveryHistory).toEqual({
          missedDate: expect.any(Timestamp), // Should be calculated based on recovery requirement
          recoveryDate: Timestamp.fromDate(thursdayDate),
          postsRequired: 2,
          postsWritten: 2,
          recoveredAt: expect.any(Timestamp),
        });
      });
    });
  });

  describe('when longest streak should be updated (REQ-018)', () => {
    describe('when currentStreak exceeds previous longestStreak', () => {
      it('updates longestStreak during recovery completion (eligible → onStreak)', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z'); // Wednesday
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 1,
            deadline: Timestamp.fromDate(wednesdayDate),
            missedDate: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
          currentStreak: 0,
          originalStreak: 8, // Recovery will make currentStreak = 9
          longestStreak: 5,   // Should be updated to 9
        });

        const todayPostCount = 2; // Completes recovery
        const result = calculateEligibleToOnStreakPure(userId, wednesdayDate, streakInfo, todayPostCount);
        
        expect(result?.updates.currentStreak).toBe(9); // originalStreak + 1
        expect(result?.updates.longestStreak).toBe(9); // Updated from 5 to 9
      });

      it('updates longestStreak during same-day recovery (missed → onStreak)', () => {
        const thursdayDate = new Date('2024-01-18T10:00:00Z'); // Thursday
        const streakInfo = createStreakInfo({
          status: { type: RecoveryStatusType.MISSED },
          currentStreak: 0,
          originalStreak: 0,
          longestStreak: 2, // Should be updated to 3
        });

        const todayPostCount = 3; // Three posts same day
        const result = calculateMissedToOnStreakPure(userId, thursdayDate, streakInfo, todayPostCount);
        
        expect(result?.updates.currentStreak).toBe(3);
        expect(result?.updates.longestStreak).toBe(3); // Updated from 2 to 3
      });

      it('updates longestStreak during cross-day building (missed → onStreak)', () => {
        const saturdayDate = new Date('2024-01-20T10:00:00Z'); // Saturday
        const streakInfo = createStreakInfo({
          status: { type: RecoveryStatusType.MISSED },
          currentStreak: 6, // Had 6 from previous days
          originalStreak: 0,
          longestStreak: 7, // Should be updated to 7
        });

        const todayPostCount = 1; // One more post (currentStreak becomes 7)
        const result = calculateMissedToOnStreakPure(userId, saturdayDate, streakInfo, todayPostCount);
        
        expect(result?.updates.currentStreak).toBe(7);
        expect(result?.updates.longestStreak).toBe(7); // Should remain 7 (no change needed)
      });

      it('updates longestStreak when currentStreak reaches new high', () => {
        const saturdayDate = new Date('2024-01-20T10:00:00Z'); // Saturday
        const streakInfo = createStreakInfo({
          status: { type: RecoveryStatusType.MISSED },
          currentStreak: 9, // Had 9 from previous days
          originalStreak: 0,
          longestStreak: 8, // Should be updated to 10
        });

        const todayPostCount = 1; // One more post (currentStreak becomes 10)
        const result = calculateMissedToOnStreakPure(userId, saturdayDate, streakInfo, todayPostCount);
        
        expect(result?.updates.currentStreak).toBe(10);
        expect(result?.updates.longestStreak).toBe(10); // Updated from 8 to 10
      });
    });

    describe('when currentStreak does not exceed longestStreak', () => {
      it('does not update longestStreak during recovery', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z'); // Wednesday
        const streakInfo = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 1,
            deadline: Timestamp.fromDate(wednesdayDate),
            missedDate: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
          currentStreak: 0,
          originalStreak: 3, // Recovery will make currentStreak = 4
          longestStreak: 10, // Should remain 10
        });

        const todayPostCount = 2; // Completes recovery
        const result = calculateEligibleToOnStreakPure(userId, wednesdayDate, streakInfo, todayPostCount);
        
        expect(result?.updates.currentStreak).toBe(4); // originalStreak + 1
        expect(result?.updates.longestStreak).toBe(10); // Unchanged (4 < 10)
      });

      it('does not update longestStreak when building streak below max', () => {
        const thursdayDate = new Date('2024-01-18T10:00:00Z'); // Thursday
        const streakInfo = createStreakInfo({
          status: { type: RecoveryStatusType.MISSED },
          currentStreak: 0,
          originalStreak: 0,
          longestStreak: 15, // Should remain 15
        });

        const todayPostCount = 2; // Two posts same day
        const result = calculateMissedToOnStreakPure(userId, thursdayDate, streakInfo, todayPostCount);
        
        expect(result?.updates.currentStreak).toBe(2);
        expect(result?.updates.longestStreak).toBe(15); // Unchanged (2 < 15)
      });
    });

    describe('when longestStreak is initially undefined', () => {
      it('sets longestStreak to currentStreak value', () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z'); // Wednesday
        const streakInfoBase = createStreakInfo({
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 1,
            deadline: Timestamp.fromDate(wednesdayDate),
            missedDate: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
          currentStreak: 0,
          originalStreak: 5,
        });
        // Remove longestStreak to simulate undefined case
        const streakInfo = { ...streakInfoBase, longestStreak: undefined } as unknown as StreakInfo;

        const todayPostCount = 2; // Completes recovery
        const result = calculateEligibleToOnStreakPure(userId, wednesdayDate, streakInfo, todayPostCount);
        
        expect(result?.updates.currentStreak).toBe(6); // originalStreak + 1
        expect(result?.updates.longestStreak).toBe(6); // Set to currentStreak (was undefined)
      });
    });
  });
});