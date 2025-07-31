import { describe, it, expect } from '@jest/globals';
import {
  calculateRecoveryRequirement,
  isValidDateString,
  getCurrentSeoulDate,
  countPostsFromQueryResult,
  hasPostsFromQueryResult
} from '../calendar';

describe('Calendar Behavior Tests - Pure Functions', () => {

  describe('Recovery Requirements', () => {
    describe('when recovery happens on working day', () => {
      it('requires 2 posts for recovery', () => {
        const missedTuesday = new Date('2024-01-16T10:00:00Z'); // Tuesday
        const currentWednesday = new Date('2024-01-17T10:00:00Z'); // Wednesday
        
        const result = calculateRecoveryRequirement(missedTuesday, currentWednesday);
        
        expect(result.postsRequired).toBe(2);
        expect(result.currentPosts).toBe(0);
      });
    });

    describe('when recovery happens on weekend', () => {
      it('requires 1 post for recovery', () => {
        const missedFriday = new Date('2024-01-19T10:00:00Z'); // Friday
        const currentSaturday = new Date('2024-01-20T10:00:00Z'); // Saturday
        
        const result = calculateRecoveryRequirement(missedFriday, currentSaturday);
        
        expect(result.postsRequired).toBe(1);
        expect(result.currentPosts).toBe(0);
      });
    });

    describe('when given invalid dates', () => {
      it('throws error for invalid missed date', () => {
        const invalidDate = new Date('invalid');
        const validDate = new Date('2024-01-17T10:00:00Z');
        
        expect(() => calculateRecoveryRequirement(invalidDate, validDate))
          .toThrow('Invalid missedDate provided to calculateRecoveryRequirement');
      });

      it('throws error for invalid current date', () => {
        const validDate = new Date('2024-01-16T10:00:00Z');
        const invalidDate = new Date('invalid');
        
        expect(() => calculateRecoveryRequirement(validDate, invalidDate))
          .toThrow('Invalid currentDate provided to calculateRecoveryRequirement');
      });
    });
  });

  describe('Post Counting (Pure Functions)', () => {
    describe('when query result has posts', () => {
      it('returns correct post count', () => {
        const queryResult = { size: 3 };
        
        const result = countPostsFromQueryResult(queryResult);
        
        expect(result).toBe(3);
      });

      it('returns zero when no posts exist', () => {
        const queryResult = { size: 0 };
        
        const result = countPostsFromQueryResult(queryResult);
        
        expect(result).toBe(0);
      });
    });
  });

  describe('Post Existence Checking (Pure Functions)', () => {
    describe('when query result has posts', () => {
      it('returns true for existing posts', () => {
        const queryResult = { empty: false };
        
        const result = hasPostsFromQueryResult(queryResult);
        
        expect(result).toBe(true);
      });

      it('returns false when no posts exist', () => {
        const queryResult = { empty: true };
        
        const result = hasPostsFromQueryResult(queryResult);
        
        expect(result).toBe(false);
      });
    });
  });

  describe('Date String Validation', () => {
    describe('when given valid date strings', () => {
      it('accepts YYYY-MM-DD format', () => {
        expect(isValidDateString('2024-01-16')).toBe(true);
        expect(isValidDateString('2024-12-31')).toBe(true);
      });
    });

    describe('when given invalid date strings', () => {
      it('rejects incorrect formats', () => {
        expect(isValidDateString('2024/01/16')).toBe(false);
        expect(isValidDateString('24-01-16')).toBe(false);
        expect(isValidDateString('2024-1-16')).toBe(false);
        expect(isValidDateString('invalid')).toBe(false);
      });
    });
  });

  describe('Current Time Operations', () => {
    describe('when getting current Seoul time', () => {
      it('returns Seoul timezone date', () => {
        const result = getCurrentSeoulDate();
        
        expect(result).toBeInstanceOf(Date);
      });
    });
  });

  describe('Real-World Scenarios', () => {
    describe('original timezone bug case', () => {
      it('correctly counts posts from query result', () => {
        const queryResult = { size: 2 }; // User had 2 posts on July 31st
        
        const result = countPostsFromQueryResult(queryResult);
        
        expect(result).toBe(2);
      });
    });

    describe('recovery requirement scenarios', () => {
      it('handles working day recovery correctly', () => {
        const missedTuesday = new Date('2024-01-16T10:00:00Z');
        const currentWednesday = new Date('2024-01-17T10:00:00Z');
        
        const result = calculateRecoveryRequirement(missedTuesday, currentWednesday);
        
        expect(result).toMatchObject({
          postsRequired: 2,
          currentPosts: 0,
          deadline: expect.any(String),
          missedDate: expect.any(String)
        });
      });

      it('handles weekend recovery correctly', () => {
        const missedFriday = new Date('2024-01-19T10:00:00Z');
        const currentSaturday = new Date('2024-01-20T10:00:00Z');
        
        const result = calculateRecoveryRequirement(missedFriday, currentSaturday);
        
        expect(result).toMatchObject({
          postsRequired: 1,
          currentPosts: 0,
          deadline: expect.any(String),
          missedDate: expect.any(String)
        });
      });
    });
  });
});