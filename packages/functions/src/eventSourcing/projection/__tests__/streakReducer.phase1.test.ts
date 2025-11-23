import { describe, it, expect } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import { Event, EventType } from '../../types/Event';
import {
  applyEventsToProjection,
  createInitialProjection,
} from '../streakReducer';

// ============================================================================
// PHASE 1: Basic Streak Tracking (phase1-v1)
// ============================================================================

describe('Phase 1: Basic Streak Tracking', () => {
  describe('Initial state', () => {
    it('creates projection with correct defaults', () => {
      const initial = createInitialProjection();

      expect(initial.lastContributionDate).toBeNull();
      expect(initial.currentDayPostCount).toBe(0);
      expect(initial.appliedSeq).toBe(0);
      expect(initial.projectorVersion).toBe('phase1-v1');
    });
  });

  describe('POST_CREATED events', () => {
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
      ];

      const result = applyEventsToProjection(state, events, todayDayKey);

      expect(result.currentDayPostCount).toBe(2);
    });

    it('does not count past day posts', () => {
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
      ];

      const result = applyEventsToProjection(state, events, todayDayKey);

      expect(result.currentDayPostCount).toBe(0);
      expect(result.lastContributionDate).toBe('2025-01-15');
    });
  });

  describe('POST_DELETED events', () => {
    it('updates appliedSeq but does not change counts', () => {
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

  describe('TIMEZONE_CHANGED events', () => {
    it('updates appliedSeq but does not change counts', () => {
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

  describe('Mixed event types', () => {
    it('applies all events in order and updates appliedSeq', () => {
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

  describe('Idempotency', () => {
    it('produces same result when replaying events', () => {
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
  });
});
