import { Event, EventType, PostCreatedEvent, DayClosedEvent } from '../../types/Event';
import { StreamProjectionPhase2 } from '../../types/StreamProjectionPhase2';
import { getEndOfDay } from '../../utils/workingDayUtils';

/**
 * Test utility functions for Phase 2.1 projection tests.
 * Provides helpers to create test data and events.
 */

/**
 * Create a PostCreated event for testing
 */
export function createPostEvent(
  dayKey: string,
  seq: number = 1,
  postId: string = 'test-post',
): PostCreatedEvent {
  return {
    seq,
    type: EventType.POST_CREATED,
    createdAt: getEndOfDay(dayKey, 'Asia/Seoul'),
    dayKey,
    payload: {
      postId,
      boardId: 'test-board',
      contentLength: 100,
    },
  };
}

/**
 * Create a DayClosed event for testing
 */
export function createDayClosedEvent(
  dayKey: string,
  seq: number = 1,
  timezone: string = 'Asia/Seoul',
): DayClosedEvent {
  return {
    seq,
    type: EventType.DAY_CLOSED,
    createdAt: getEndOfDay(dayKey, timezone),
    dayKey,
    idempotencyKey: `test-user:${dayKey}:closed`,
  };
}

/**
 * Create a minimal projection state for testing
 */
export function createTestProjection(
  overrides: Partial<StreamProjectionPhase2> = {},
): StreamProjectionPhase2 {
  return {
    status: { type: 'missed' },
    currentStreak: 0,
    originalStreak: 0,
    longestStreak: 0,
    lastContributionDate: null,
    appliedSeq: 0,
    projectorVersion: 'phase2.1-v1',
    lastEvaluatedDayKey: undefined,
    ...overrides,
  };
}

/**
 * Group events by dayKey for testing virtual closures
 */
export function groupEventsByDayKey(events: Event[]): Map<string, Event[]> {
  const grouped = new Map<string, Event[]>();

  for (const event of events) {
    const existing = grouped.get(event.dayKey) || [];
    existing.push(event);
    grouped.set(event.dayKey, existing);
  }

  return grouped;
}
