import { describe, it, expect } from '@jest/globals';
import {
  applyEventsToProjection,
  createInitialProjection,
} from '../streakReducer';
import { Event, EventType } from '../../types/Event';
import { Timestamp } from 'firebase-admin/firestore';

describe('Streak Reducer - Pure Function Tests', () => {
  describe('when processing PostCreated events', () => {
    it('updates lastContributionDate to latest dayKey', () => {
      const state = createInitialProjection();
      const events: Event[] = [
        {
          seq: 1,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-15',
          payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
        },
        {
          seq: 2,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-16',
          payload: { postId: 'p2', boardId: 'b1', contentLength: 150 },
        },
      ];

      const result = applyEventsToProjection(state, events, '2025-01-17');

      expect(result.lastContributionDate).toBe('2025-01-16');
      expect(result.appliedSeq).toBe(2);
    });

    it('increments currentDayPostCount for today events', () => {
      const state = createInitialProjection();
      const todayDayKey = '2025-01-17';
      const events: Event[] = [
        {
          seq: 1,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: todayDayKey,
          payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
        },
        {
          seq: 2,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: todayDayKey,
          payload: { postId: 'p2', boardId: 'b1', contentLength: 150 },
        },
        {
          seq: 3,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-16',
          payload: { postId: 'p3', boardId: 'b1', contentLength: 200 },
        },
      ];

      const result = applyEventsToProjection(state, events, todayDayKey);

      expect(result.currentDayPostCount).toBe(2);
    });

    it('does not decrement count for past days', () => {
      const state = createInitialProjection();
      const todayDayKey = '2025-01-17';
      const events: Event[] = [
        {
          seq: 1,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-15',
          payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
        },
        {
          seq: 2,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-16',
          payload: { postId: 'p2', boardId: 'b1', contentLength: 150 },
        },
      ];

      const result = applyEventsToProjection(state, events, todayDayKey);

      expect(result.currentDayPostCount).toBe(0);
      expect(result.lastContributionDate).toBe('2025-01-16');
    });
  });

  describe('when re-applying same events (idempotency test)', () => {
    it('produces same result with empty event array', () => {
      const state = createInitialProjection();
      const events: Event[] = [
        {
          seq: 1,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-15',
          payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
        },
      ];

      const result1 = applyEventsToProjection(state, events, '2025-01-17');
      const result2 = applyEventsToProjection(result1, [], '2025-01-17');

      expect(result2).toEqual(result1);
    });

    it('maintains appliedSeq when processing duplicate seq ranges', () => {
      const state = {
        ...createInitialProjection(),
        appliedSeq: 2,
        lastContributionDate: '2025-01-16',
        currentDayPostCount: 0,
      };

      const result = applyEventsToProjection(state, [], '2025-01-17');

      expect(result.appliedSeq).toBe(2);
    });
  });

  describe('when processing PostDeleted events', () => {
    it('updates appliedSeq but does not change counts (Phase 1)', () => {
      const state = {
        ...createInitialProjection(),
        lastContributionDate: '2025-01-15',
        currentDayPostCount: 2,
        appliedSeq: 1,
      };

      const events: Event[] = [
        {
          seq: 2,
          type: EventType.POST_DELETED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-15',
          payload: { postId: 'p1', boardId: 'b1' },
        },
      ];

      const result = applyEventsToProjection(state, events, '2025-01-17');

      expect(result.lastContributionDate).toBe('2025-01-15');
      expect(result.currentDayPostCount).toBe(2);
      expect(result.appliedSeq).toBe(2);
    });
  });

  describe('when processing TimezoneChanged events', () => {
    it('updates appliedSeq but does not change counts (Phase 1)', () => {
      const state = {
        ...createInitialProjection(),
        lastContributionDate: '2025-01-15',
        currentDayPostCount: 1,
        appliedSeq: 1,
      };

      const events: Event[] = [
        {
          seq: 2,
          type: EventType.TIMEZONE_CHANGED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-15',
          payload: { oldTimezone: 'Asia/Seoul', newTimezone: 'America/New_York' },
        },
      ];

      const result = applyEventsToProjection(state, events, '2025-01-17');

      expect(result.lastContributionDate).toBe('2025-01-15');
      expect(result.currentDayPostCount).toBe(1);
      expect(result.appliedSeq).toBe(2);
    });
  });

  describe('when processing mixed event types', () => {
    it('applies all events in order and updates appliedSeq correctly', () => {
      const state = createInitialProjection();
      const todayDayKey = '2025-01-17';
      const events: Event[] = [
        {
          seq: 1,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-16',
          payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
        },
        {
          seq: 2,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: todayDayKey,
          payload: { postId: 'p2', boardId: 'b1', contentLength: 150 },
        },
        {
          seq: 3,
          type: EventType.POST_DELETED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-16',
          payload: { postId: 'p1', boardId: 'b1' },
        },
        {
          seq: 4,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: todayDayKey,
          payload: { postId: 'p3', boardId: 'b1', contentLength: 200 },
        },
      ];

      const result = applyEventsToProjection(state, events, todayDayKey);

      expect(result.lastContributionDate).toBe(todayDayKey);
      expect(result.currentDayPostCount).toBe(2);
      expect(result.appliedSeq).toBe(4);
    });
  });

  describe('when initial projection is created', () => {
    it('has correct default values', () => {
      const initial = createInitialProjection();

      expect(initial.lastContributionDate).toBeNull();
      expect(initial.currentDayPostCount).toBe(0);
      expect(initial.appliedSeq).toBe(0);
      expect(initial.projectorVersion).toBe('phase1-v1');
    });
  });
});
