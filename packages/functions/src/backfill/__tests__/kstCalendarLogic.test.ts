/**
 * KST Calendar Logic Tests for Historical Context
 * 
 * Tests for REQ-103: KST Day Boundaries & Calendar
 * Tests for REQ-105: Daily Bucketing & First-Post Rule
 * 
 * These tests verify calendar calculations specific to backfill simulation,
 * focusing on historical date processing and weekend/working day rules.
 */

import { describe, it, expect } from '@jest/globals';
import {
  isHistoricalWorkingDay,
  getKstDayBoundaries,
  doesSatisfyDailyStreak,
  canContributeToRecovery,
  calculateHistoricalRecoveryWindow,
} from '../kstCalendarLogic';
import { DayBucket, PostingEvent } from '../types';
import { Timestamp } from 'firebase-admin/firestore';

describe('KST Calendar Rules for Historical Processing', () => {
  describe('when determining working day status historically', () => {
    it('identifies Monday through Friday as working days', () => {
      // Arrange: Week of 2024-01-15 (Monday) through 2024-01-21 (Sunday)
      const monday = '2024-01-15';
      const tuesday = '2024-01-16';
      const wednesday = '2024-01-17';
      const thursday = '2024-01-18';
      const friday = '2024-01-19';
      const saturday = '2024-01-20';
      const sunday = '2024-01-21';

      // Act & Assert
      expect(isHistoricalWorkingDay(monday)).toBe(true);
      expect(isHistoricalWorkingDay(tuesday)).toBe(true);
      expect(isHistoricalWorkingDay(wednesday)).toBe(true);
      expect(isHistoricalWorkingDay(thursday)).toBe(true);
      expect(isHistoricalWorkingDay(friday)).toBe(true);
      expect(isHistoricalWorkingDay(saturday)).toBe(false);
      expect(isHistoricalWorkingDay(sunday)).toBe(false);
    });

    it('handles edge cases around month boundaries', () => {
      // Arrange: End of January 2024
      const jan31 = '2024-01-31'; // Wednesday
      const feb1 = '2024-02-01'; // Thursday
      const feb3 = '2024-02-03'; // Saturday

      // Act & Assert
      expect(isHistoricalWorkingDay(jan31)).toBe(true);
      expect(isHistoricalWorkingDay(feb1)).toBe(true);
      expect(isHistoricalWorkingDay(feb3)).toBe(false);
    });
  });

  describe('when processing KST day boundaries', () => {
    it('correctly identifies posts at exactly 00:00:00 KST', () => {
      // Arrange: Post at exactly KST midnight
      const kstMidnight = new Date('2024-01-16T00:00:00+09:00');
      
      // Act
      const boundaries = getKstDayBoundaries('2024-01-16');
      
      // Assert
      expect(boundaries.start.getTime()).toBeLessThanOrEqual(kstMidnight.getTime());
      expect(boundaries.end.getTime()).toBeGreaterThan(kstMidnight.getTime());
    });

    it('correctly identifies posts at 23:59:59.999 KST', () => {
      // Arrange: Post just before end of day
      const almostMidnight = new Date('2024-01-16T23:59:59.999+09:00');
      
      // Act
      const boundaries = getKstDayBoundaries('2024-01-16');
      
      // Assert
      expect(boundaries.start.getTime()).toBeLessThanOrEqual(almostMidnight.getTime());
      expect(boundaries.end.getTime()).toBeGreaterThanOrEqual(almostMidnight.getTime());
    });

    it('provides non-overlapping boundaries for consecutive days', () => {
      // Arrange
      const day1 = '2024-01-15';
      const day2 = '2024-01-16';
      
      // Act
      const boundaries1 = getKstDayBoundaries(day1);
      const boundaries2 = getKstDayBoundaries(day2);
      
      // Assert
      expect(boundaries1.end.getTime()).toBeLessThan(boundaries2.start.getTime());
    });
  });

  describe('when determining daily streak satisfaction', () => {
    it('allows working day posts to satisfy daily streak', () => {
      // Arrange: Monday with posts
      const mondayBucket = createMockDayBucket('2024-01-15', true, [
        createMockEvent('post1', '09:00'),
        createMockEvent('post2', '14:00'),
      ]);

      // Act
      const satisfied = doesSatisfyDailyStreak(mondayBucket);

      // Assert
      expect(satisfied).toBe(true);
    });

    it('prevents Saturday posts from satisfying daily streak', () => {
      // Arrange: Saturday with posts
      const saturdayBucket = createMockDayBucket('2024-01-20', false, [
        createMockEvent('post1', '10:00'),
      ]);

      // Act
      const satisfied = doesSatisfyDailyStreak(saturdayBucket);

      // Assert
      expect(satisfied).toBe(false);
    });

    it('prevents Sunday posts from satisfying daily streak', () => {
      // Arrange: Sunday with posts
      const sundayBucket = createMockDayBucket('2024-01-21', false, [
        createMockEvent('post1', '15:00'),
      ]);

      // Act
      const satisfied = doesSatisfyDailyStreak(sundayBucket);

      // Assert
      expect(satisfied).toBe(false);
    });

    it('requires at least one post to satisfy streak on working day', () => {
      // Arrange: Monday with no posts
      const emptyMondayBucket = createMockDayBucket('2024-01-15', true, []);

      // Act
      const satisfied = doesSatisfyDailyStreak(emptyMondayBucket);

      // Assert
      expect(satisfied).toBe(false);
    });
  });

  describe('when determining recovery contribution', () => {
    it('allows Saturday posts to contribute to Friday recovery only', () => {
      // Arrange: Saturday posts (Friday was missed)
      const saturdayBucket = createMockDayBucket('2024-01-20', false, [
        createMockEvent('post1', '10:00'),
      ]);

      // Act
      const canContribute = canContributeToRecovery(saturdayBucket, '2024-01-19'); // Friday

      // Assert
      expect(canContribute).toBe(true);
    });

    it('prevents Saturday posts from contributing to other day recovery', () => {
      // Arrange: Saturday posts (Wednesday was missed)
      const saturdayBucket = createMockDayBucket('2024-01-20', false, [
        createMockEvent('post1', '10:00'),
      ]);

      // Act
      const canContribute = canContributeToRecovery(saturdayBucket, '2024-01-17'); // Wednesday

      // Assert
      expect(canContribute).toBe(false);
    });

    it('allows working day posts to contribute to recovery', () => {
      // Arrange: Tuesday posts (Monday was missed)
      const tuesdayBucket = createMockDayBucket('2024-01-16', true, [
        createMockEvent('post1', '10:00'),
        createMockEvent('post2', '15:00'),
      ]);

      // Act
      const canContribute = canContributeToRecovery(tuesdayBucket, '2024-01-15'); // Monday

      // Assert
      expect(canContribute).toBe(true);
    });

    it('prevents Sunday posts from contributing to any recovery', () => {
      // Arrange: Sunday posts
      const sundayBucket = createMockDayBucket('2024-01-21', false, [
        createMockEvent('post1', '12:00'),
      ]);

      // Act
      const canContribute = canContributeToRecovery(sundayBucket, '2024-01-19'); // Friday

      // Assert
      expect(canContribute).toBe(false);
    });
  });

  describe('when calculating historical recovery windows', () => {
    it('sets Monday-Thursday miss recovery to next working day with 2 posts', () => {
      // Arrange: Tuesday miss
      const tuesdayMiss = '2024-01-16';

      // Act
      const recoveryWindow = calculateHistoricalRecoveryWindow(tuesdayMiss);

      // Assert
      expect(recoveryWindow.eligibleDate).toBe('2024-01-17'); // Wednesday
      expect(recoveryWindow.postsRequired).toBe(2);
      expect(recoveryWindow.isWorkingDayRecovery).toBe(true);
    });

    it('sets Friday miss recovery to Saturday only with 1 post', () => {
      // Arrange: Friday miss
      const fridayMiss = '2024-01-19';

      // Act
      const recoveryWindow = calculateHistoricalRecoveryWindow(fridayMiss);

      // Assert
      expect(recoveryWindow.eligibleDate).toBe('2024-01-20'); // Saturday
      expect(recoveryWindow.postsRequired).toBe(1);
      expect(recoveryWindow.isWorkingDayRecovery).toBe(false);
    });

    it('handles Friday miss at end of month correctly', () => {
      // Arrange: Friday January 26, 2024
      const fridayMiss = '2024-01-26';

      // Act
      const recoveryWindow = calculateHistoricalRecoveryWindow(fridayMiss);

      // Assert
      expect(recoveryWindow.eligibleDate).toBe('2024-01-27'); // Saturday
      expect(recoveryWindow.postsRequired).toBe(1);
    });

    it('handles Monday miss after weekend correctly', () => {
      // Arrange: Monday after weekend
      const mondayMiss = '2024-01-22';

      // Act
      const recoveryWindow = calculateHistoricalRecoveryWindow(mondayMiss);

      // Assert
      expect(recoveryWindow.eligibleDate).toBe('2024-01-23'); // Tuesday
      expect(recoveryWindow.postsRequired).toBe(2);
      expect(recoveryWindow.isWorkingDayRecovery).toBe(true);
    });
  });
});

// Test Helper Functions

function createMockDayBucket(
  kstDateString: string, 
  isWorkingDay: boolean, 
  events: PostingEvent[]
): DayBucket {
  return {
    kstDateString,
    kstDate: new Date(`${kstDateString}T00:00:00+09:00`),
    isWorkingDay,
    events,
  };
}

function createMockEvent(id: string, time: string): PostingEvent {
  const kstTimestamp = new Date(`2024-01-15T${time}:00+09:00`);
  return {
    id,
    boardId: 'board123',
    title: `Post ${id}`,
    contentLength: 100,
    serverTimestamp: Timestamp.fromDate(kstTimestamp),
    kstTimestamp,
    kstDateString: '2024-01-15',
  };
}