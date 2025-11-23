import { describe, it, expect } from '@jest/globals';
import { explainStreakReducer } from '../explainStreakReducer';
import { createInitialPhase2Projection } from '../streakReducerPhase2';
import { EventType, DayClosedEvent } from '../../types/Event';
import { createPostEvent, createTestProjection } from './testUtils';
import { getEndOfDay } from '../../utils/workingDayUtils';

const TZ = 'Asia/Seoul';

describe('explainStreakReducer', () => {
  describe('when given empty event array', () => {
    it('returns initial projection with no explanations', () => {
      const initialState = createInitialPhase2Projection();
      const events: any[] = [];

      const result = explainStreakReducer(initialState, events, TZ);

      expect(result.finalProjection).toEqual(initialState);
      expect(result.eventExplanations).toHaveLength(0);
      expect(result.summary.totalEvents).toBe(0);
      expect(result.summary.virtualClosures).toBe(0);
      expect(result.summary.statusTransitions).toBe(0);
      expect(result.summary.streakChanges).toBe(0);
    });
  });

  describe('when processing single PostCreated event', () => {
    it('returns explanation with state change details', () => {
      const initialState = createTestProjection({
        status: { type: 'missed' },
        currentStreak: 0,
      });
      const events = [createPostEvent('2025-10-20', 1)];

      const result = explainStreakReducer(initialState, events, TZ);

      expect(result.eventExplanations).toHaveLength(1);
      const explanation = result.eventExplanations[0];
      expect(explanation.seq).toBe(1);
      expect(explanation.type).toBe('PostCreated');
      expect(explanation.dayKey).toBe('2025-10-20');
      expect(explanation.isVirtual).toBe(false);
      expect(explanation.stateBefore.status).toBe('missed');
      expect(explanation.stateAfter.lastContributionDate).toBe('2025-10-20');
    });

    it('includes changes array with field-level diffs', () => {
      const initialState = createTestProjection({
        status: { type: 'missed' },
        lastContributionDate: null,
      });
      const events = [createPostEvent('2025-10-20', 1)];

      const result = explainStreakReducer(initialState, events, TZ);

      const explanation = result.eventExplanations[0];
      const lastContributionChange = explanation.changes.find((c) => c.field === 'lastContributionDate');
      expect(lastContributionChange).toBeDefined();
      expect(lastContributionChange?.before).toBe(null);
      expect(lastContributionChange?.after).toBe('2025-10-20');
    });
  });

  describe('when processing virtual DayClosed event', () => {
    it('marks event as virtual in explanation', () => {
      const initialState = createTestProjection({
        status: { type: 'onStreak' },
        currentStreak: 1,
      });
      const virtualClosure: DayClosedEvent = {
        seq: 0,
        type: EventType.DAY_CLOSED,
        createdAt: getEndOfDay('2025-10-20', TZ),
        dayKey: '2025-10-20',
        idempotencyKey: 'virtual:2025-10-20:closed',
      };

      const result = explainStreakReducer(initialState, [virtualClosure], TZ);

      expect(result.eventExplanations).toHaveLength(1);
      expect(result.eventExplanations[0].isVirtual).toBe(true);
      expect(result.summary.virtualClosures).toBe(1);
    });
  });

  describe('when status transition occurs', () => {
    it('detects onStreak to eligible transition', () => {
      const initialState = createTestProjection({
        status: { type: 'onStreak' },
        currentStreak: 3,
        originalStreak: 3,
      });
      const virtualClosure: DayClosedEvent = {
        seq: 0,
        type: EventType.DAY_CLOSED,
        createdAt: getEndOfDay('2025-10-20', TZ),
        dayKey: '2025-10-20',
        idempotencyKey: 'virtual:2025-10-20:closed',
      };

      const result = explainStreakReducer(initialState, [virtualClosure], TZ);

      const explanation = result.eventExplanations[0];
      expect(explanation.stateBefore.status).toBe('onStreak');
      expect(explanation.stateAfter.status).toBe('eligible');
      expect(result.summary.statusTransitions).toBe(1);
    });

    it('includes reason for status change', () => {
      const initialState = createTestProjection({
        status: { type: 'onStreak' },
        currentStreak: 3,
      });
      const virtualClosure: DayClosedEvent = {
        seq: 0,
        type: EventType.DAY_CLOSED,
        createdAt: getEndOfDay('2025-10-20', TZ),
        dayKey: '2025-10-20',
        idempotencyKey: 'virtual:2025-10-20:closed',
      };

      const result = explainStreakReducer(initialState, [virtualClosure], TZ);

      const statusChange = result.eventExplanations[0].changes.find((c) => c.field === 'status.type');
      expect(statusChange).toBeDefined();
      expect(statusChange?.reason).toContain('working day without posts');
    });
  });

  describe('when streak value changes', () => {
    it('counts streak changes in summary', () => {
      const initialState = createTestProjection({
        status: { type: 'onStreak' },
        currentStreak: 3,
      });
      const virtualClosure: DayClosedEvent = {
        seq: 0,
        type: EventType.DAY_CLOSED,
        createdAt: getEndOfDay('2025-10-20', TZ),
        dayKey: '2025-10-20',
        idempotencyKey: 'virtual:2025-10-20:closed',
      };

      const result = explainStreakReducer(initialState, [virtualClosure], TZ);

      // Transition to eligible sets currentStreak to 0
      expect(result.summary.streakChanges).toBeGreaterThan(0);
    });
  });

  describe('when processing multiple events', () => {
    it('returns explanation for each event in sequence', () => {
      const initialState = createInitialPhase2Projection();
      const events = [
        createPostEvent('2025-10-20', 1),
        createPostEvent('2025-10-21', 2),
        createPostEvent('2025-10-22', 3),
      ];

      const result = explainStreakReducer(initialState, events, TZ);

      expect(result.eventExplanations).toHaveLength(3);
      expect(result.eventExplanations[0].seq).toBe(1);
      expect(result.eventExplanations[1].seq).toBe(2);
      expect(result.eventExplanations[2].seq).toBe(3);
    });

    it('calculates correct evaluated period', () => {
      const initialState = createInitialPhase2Projection();
      const events = [createPostEvent('2025-10-20', 1), createPostEvent('2025-10-22', 2)];

      const result = explainStreakReducer(initialState, events, TZ);

      expect(result.summary.evaluatedPeriod.start).toBe('2025-10-20');
      expect(result.summary.evaluatedPeriod.end).toBe('2025-10-22');
    });
  });

  describe('when eligible context exists', () => {
    it('includes eligibleContext in snapshot', () => {
      const initialState = createTestProjection({
        status: {
          type: 'eligible',
          postsRequired: 2,
          currentPosts: 1,
          deadline: getEndOfDay('2025-10-21', TZ),
          missedDate: getEndOfDay('2025-10-20', TZ),
        },
        currentStreak: 0,
        originalStreak: 3,
      });
      const events = [createPostEvent('2025-10-21', 1)];

      const result = explainStreakReducer(initialState, events, TZ);

      const stateBefore = result.eventExplanations[0].stateBefore;
      expect(stateBefore.eligibleContext).toBeDefined();
      expect(stateBefore.eligibleContext?.postsRequired).toBe(2);
      expect(stateBefore.eligibleContext?.currentPosts).toBe(1);
    });
  });

  // Note: missedContext with missedPostDates removed in phase2.1-no-crossday-v1
  // (no cross-day rebuild tracking)
});
