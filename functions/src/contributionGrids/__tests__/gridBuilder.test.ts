import { describe, it, expect, jest } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import {
  getWindowRange,
  buildGridFromActivities,
  rebuildContributionGrid,
  updateContributionGridRealtime,
} from '../gridBuilder';
import { ActivityType } from '../types';

// Mock Firebase Admin
jest.mock('../../shared/admin', () => ({
  __esModule: true,
  default: {
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn(),
        })),
      })),
      runTransaction: jest.fn(),
    })),
  },
}));

describe('Grid Builder Functions', () => {
  describe('getWindowRange', () => {
    it('should return correct 4-week window range in KST', () => {
      // Mock a specific date (Monday, 2024-01-15)
      const mockDate = new Date('2024-01-15T00:00:00.000Z');

      const result = getWindowRange(mockDate);

      // Should return 4 weeks ago Monday to today
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
      expect(result.start.getTime()).toBeLessThan(result.end.getTime());

      // Start should be 4 weeks ago Monday
      const startDay = result.start.getDay(); // 0 = Sunday, 1 = Monday
      expect(startDay).toBe(1); // Monday
    });

    it('should handle weekend dates correctly', () => {
      // Mock a Saturday
      const mockDate = new Date('2024-01-20T00:00:00.000Z'); // Saturday

      const result = getWindowRange(mockDate);

      // Should still return Monday to Friday range
      expect(result.start.getDay()).toBe(1); // Monday
      expect(result.end.getDay()).toBe(5); // Friday
    });

    it('should handle month boundaries correctly', () => {
      // Mock date at month boundary
      const mockDate = new Date('2024-02-01T00:00:00.000Z');

      const result = getWindowRange(mockDate);

      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
      expect(result.start.getTime()).toBeLessThan(result.end.getTime());
    });
  });

  describe('buildGridFromActivities', () => {
    it('should build grid from posting activities', () => {
      const activities = [
        {
          id: '1',
          userId: 'user1',
          content: 'Hello world',
          createdAt: Timestamp.fromDate(new Date('2024-01-15T00:00:00Z')),
          contentLength: 11,
        },
        {
          id: '2',
          userId: 'user1',
          content: 'Another post',
          createdAt: Timestamp.fromDate(new Date('2024-01-15T12:00:00Z')),
          contentLength: 12,
        },
        {
          id: '3',
          userId: 'user1',
          content: 'Different day',
          createdAt: Timestamp.fromDate(new Date('2024-01-16T00:00:00Z')),
          contentLength: 13,
        },
      ];

      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-19T23:59:59Z');

      const result = buildGridFromActivities(activities, startDate, endDate, ActivityType.POSTING);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      // Should aggregate same day activities
      const day15 = result.find((d) => d.day === '2024-01-15');
      expect(day15).toBeDefined();
      expect(day15?.value).toBe(23); // 11 + 12

      const day16 = result.find((d) => d.day === '2024-01-16');
      expect(day16).toBeDefined();
      expect(day16?.value).toBe(13);
    });

    it('should build grid from commenting activities', () => {
      const activities = [
        {
          id: '1',
          userId: 'user1',
          postId: 'post1',
          createdAt: Timestamp.fromDate(new Date('2024-01-15T00:00:00Z')),
        },
        {
          id: '2',
          userId: 'user1',
          postId: 'post2',
          createdAt: Timestamp.fromDate(new Date('2024-01-15T12:00:00Z')),
        },
        {
          id: '3',
          userId: 'user1',
          postId: 'post3',
          createdAt: Timestamp.fromDate(new Date('2024-01-16T00:00:00Z')),
        },
      ];

      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-19T23:59:59Z');

      const result = buildGridFromActivities(
        activities,
        startDate,
        endDate,
        ActivityType.COMMENTING,
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      // Should count comments (1 point each)
      const day15 = result.find((d) => d.day === '2024-01-15');
      expect(day15).toBeDefined();
      expect(day15?.value).toBe(2); // 2 comments

      const day16 = result.find((d) => d.day === '2024-01-16');
      expect(day16).toBeDefined();
      expect(day16?.value).toBe(1); // 1 comment
    });

    it('should exclude weekend activities', () => {
      const activities = [
        {
          id: '1',
          userId: 'user1',
          content: 'Weekend post',
          createdAt: Timestamp.fromDate(new Date('2024-01-20T10:00:00Z')), // Saturday
          contentLength: 12,
        },
      ];

      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-19T23:59:59Z');

      const result = buildGridFromActivities(activities, startDate, endDate, ActivityType.POSTING);

      // Should not include weekend activities
      const weekendDay = result.find((d) => d.day === '2024-01-20');
      expect(weekendDay).toBeUndefined();
    });

    it('should exclude activities outside window range', () => {
      const activities = [
        {
          id: '1',
          userId: 'user1',
          content: 'Old post',
          createdAt: Timestamp.fromDate(new Date('2024-01-10T10:00:00Z')), // Before window
          contentLength: 10,
        },
        {
          id: '2',
          userId: 'user1',
          content: 'Valid post',
          createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          contentLength: 10,
        },
      ];

      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-19T23:59:59Z');

      const result = buildGridFromActivities(activities, startDate, endDate, ActivityType.POSTING);

      // Should only include activities within window
      const oldDay = result.find((d) => d.day === '2024-01-10');
      expect(oldDay).toBeUndefined();

      const validDay = result.find((d) => d.day === '2024-01-15');
      expect(validDay).toBeDefined();
    });

    it('should assign correct week and column values', () => {
      const activities = [
        {
          id: '1',
          userId: 'user1',
          content: 'Monday post',
          createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')), // Monday
          contentLength: 10,
        },
        {
          id: '2',
          userId: 'user1',
          content: 'Wednesday post',
          createdAt: Timestamp.fromDate(new Date('2024-01-17T10:00:00Z')), // Wednesday
          contentLength: 10,
        },
      ];

      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-19T23:59:59Z');

      const result = buildGridFromActivities(activities, startDate, endDate, ActivityType.POSTING);

      const monday = result.find((d) => d.day === '2024-01-15');
      expect(monday?.week).toBe(0); // First week
      expect(monday?.column).toBe(0); // Monday

      const wednesday = result.find((d) => d.day === '2024-01-17');
      expect(wednesday?.week).toBe(0); // First week
      expect(wednesday?.column).toBe(2); // Wednesday
    });
  });

  describe('rebuildContributionGrid', () => {
    it('should rebuild grid from user activities', async () => {
      const userId = 'user1';
      const activityType = ActivityType.POSTING;

      const result = await rebuildContributionGrid(userId, activityType);

      expect(result).toBeDefined();
      expect(result.contributions).toBeInstanceOf(Array);
      expect(result.maxValue).toBeGreaterThanOrEqual(0);
      expect(result.lastUpdated).toBeInstanceOf(Timestamp);
      expect(result.timeRange).toBeDefined();
      expect(result.timeRange.startDate).toBeDefined();
      expect(result.timeRange.endDate).toBeDefined();
    });
  });

  describe('updateContributionGridRealtime', () => {
    it('should update grid cell for new activity', async () => {
      const userId = 'user1';
      const date = '2024-01-15';
      const value = 100;
      const activityType = ActivityType.POSTING;

      // Should not throw
      await expect(
        updateContributionGridRealtime(userId, date, value, activityType),
      ).resolves.toBeUndefined();
    });

    it('should keep only the latest 20 contributions and update meta info', async () => {
      const userId = 'user2';
      const activityType = ActivityType.POSTING;
      const db = require('../../shared/admin').default.firestore();
      const docId = `${userId}_${activityType}`;
      const docRef = db.collection('contributionGrids').doc(docId);

      // Prepare a grid with 20 days (2024-01-01 ~ 2024-01-20)
      const baseContributions = Array.from({ length: 20 }, (_, i) => ({
        day: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: i + 1,
        week: 0,
        column: 0,
      }));
      const grid = {
        contributions: baseContributions,
        maxValue: 20,
        lastUpdated: Timestamp.now(),
        timeRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-20',
        },
      };
      // Mock Firestore get/set
      docRef.get.mockResolvedValueOnce({ exists: true, data: () => ({ ...grid }) });
      docRef.set.mockImplementationOnce((data: any) => {
        // assertions inside mock
        expect(data.contributions.length).toBe(20);
        // 가장 오래된 날짜(2024-01-01)는 삭제되고, 2024-01-02~2024-01-21이 남아야 함
        expect(data.contributions[0].day).toBe('2024-01-02');
        expect(data.contributions[19].day).toBe('2024-01-21');
        // maxValue는 새 값(999)이 반영되어야 함
        expect(data.maxValue).toBe(999);
        // timeRange도 최신 20개 기준으로 갱신
        expect(data.timeRange.startDate).toBe('2024-01-02');
        expect(data.timeRange.endDate).toBe('2024-01-21');
        return Promise.resolve();
      });
      db.runTransaction.mockImplementation(async (fn: any) =>
        fn({ get: docRef.get, set: docRef.set }),
      );

      // 2024-01-21에 큰 값 추가
      await updateContributionGridRealtime(userId, '2024-01-21', 999, activityType);
    });
  });
});
