import { describe, it, expect } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import {
  ContributionDay,
  ContributionGrid,
  validateContributionDay,
  validateContributionGrid,
} from '../types';

describe('ContributionGrid Types', () => {
  describe('ContributionDay', () => {
    it('should validate valid ContributionDay structure', () => {
      const validDay: ContributionDay = {
        day: '2024-01-15',
        value: 1234,
        week: 0,
        column: 0,
      };

      expect(validateContributionDay(validDay)).toBe(true);
    });

    it('should reject ContributionDay with invalid day format', () => {
      const invalidDay = {
        day: '2024/01/15', // Wrong format
        value: 1234,
        week: 0,
        column: 0,
      };

      expect(validateContributionDay(invalidDay as ContributionDay)).toBe(false);
    });

    it('should reject ContributionDay with negative value', () => {
      const invalidDay = {
        day: '2024-01-15',
        value: -1,
        week: 0,
        column: 0,
      };

      expect(validateContributionDay(invalidDay as ContributionDay)).toBe(false);
    });

    it('should reject ContributionDay with invalid week range', () => {
      const invalidDay = {
        day: '2024-01-15',
        value: 1234,
        week: 5, // Should be 0-3
        column: 0,
      };

      expect(validateContributionDay(invalidDay as ContributionDay)).toBe(false);
    });

    it('should reject ContributionDay with invalid column range', () => {
      const invalidDay = {
        day: '2024-01-15',
        value: 1234,
        week: 0,
        column: 6, // Should be 0-4
      };

      expect(validateContributionDay(invalidDay as ContributionDay)).toBe(false);
    });

    it('should reject ContributionDay with missing required fields', () => {
      const invalidDay = {
        day: '2024-01-15',
        value: 1234,
        // Missing week and column
      };

      expect(validateContributionDay(invalidDay as ContributionDay)).toBe(false);
    });
  });

  describe('ContributionGrid', () => {
    it('should validate valid ContributionGrid structure', () => {
      const validGrid: ContributionGrid = {
        contributions: [
          { day: '2024-01-15', value: 1234, week: 0, column: 0 },
          { day: '2024-01-16', value: 567, week: 0, column: 1 },
        ],
        maxValue: 1234,
        lastUpdated: Timestamp.now(),
        timeRange: {
          startDate: '2024-01-15',
          endDate: '2024-02-09',
        },
      };

      expect(validateContributionGrid(validGrid)).toBe(true);
    });

    it('should reject ContributionGrid with empty contributions array', () => {
      const invalidGrid = {
        contributions: [],
        maxValue: 0,
        lastUpdated: Timestamp.now(),
        timeRange: {
          startDate: '2024-01-15',
          endDate: '2024-02-09',
        },
      };

      expect(validateContributionGrid(invalidGrid as ContributionGrid)).toBe(false);
    });

    it('should reject ContributionGrid with invalid maxValue', () => {
      const invalidGrid = {
        contributions: [{ day: '2024-01-15', value: 1234, week: 0, column: 0 }],
        maxValue: -1, // Should be >= 0
        lastUpdated: Timestamp.now(),
        timeRange: {
          startDate: '2024-01-15',
          endDate: '2024-02-09',
        },
      };

      expect(validateContributionGrid(invalidGrid as ContributionGrid)).toBe(false);
    });

    it('should reject ContributionGrid with invalid timeRange', () => {
      const invalidGrid = {
        contributions: [{ day: '2024-01-15', value: 1234, week: 0, column: 0 }],
        maxValue: 1234,
        lastUpdated: Timestamp.now(),
        timeRange: {
          startDate: '2024-02-09', // startDate after endDate
          endDate: '2024-01-15',
        },
      };

      expect(validateContributionGrid(invalidGrid as ContributionGrid)).toBe(false);
    });

    it('should reject ContributionGrid with invalid contribution day', () => {
      const invalidGrid = {
        contributions: [
          { day: '2024-01-15', value: 1234, week: 0, column: 0 },
          { day: 'invalid-date', value: 567, week: 0, column: 1 }, // Invalid date
        ],
        maxValue: 1234,
        lastUpdated: Timestamp.now(),
        timeRange: {
          startDate: '2024-01-15',
          endDate: '2024-02-09',
        },
      };

      expect(validateContributionGrid(invalidGrid as ContributionGrid)).toBe(false);
    });

    it('should reject ContributionGrid with missing required fields', () => {
      const invalidGrid = {
        contributions: [{ day: '2024-01-15', value: 1234, week: 0, column: 0 }],
        // Missing maxValue, lastUpdated, timeRange
      };

      expect(validateContributionGrid(invalidGrid as ContributionGrid)).toBe(false);
    });
  });
});
