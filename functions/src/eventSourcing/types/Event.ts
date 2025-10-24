import { Timestamp } from 'firebase-admin/firestore';

export enum EventType {
  POST_CREATED = 'PostCreated',
  POST_DELETED = 'PostDeleted',
  TIMEZONE_CHANGED = 'TimezoneChanged',
  DAY_CLOSED = 'DayClosed', // Legacy persisted events (Phase 2)
  DAY_CLOSED_VIRTUAL = 'DayClosedVirtual', // Synthetic: working day with 0 posts
  DAY_ACTIVITY = 'DayActivity', // Synthetic: summarizes posts for a day during extension
}

export interface BaseEvent {
  seq: number;
  type: EventType;
  createdAt: Timestamp;
  dayKey: string; // YYYY-MM-DD in user's timezone
}

export interface PostCreatedEvent extends BaseEvent {
  type: EventType.POST_CREATED;
  payload: {
    postId: string;
    boardId: string;
    contentLength: number;
  };
}

export interface PostDeletedEvent extends BaseEvent {
  type: EventType.POST_DELETED;
  payload: {
    postId: string;
    boardId: string;
  };
}

export interface TimezoneChangedEvent extends BaseEvent {
  type: EventType.TIMEZONE_CHANGED;
  payload: {
    oldTimezone: string;
    newTimezone: string;
  };
}

export interface DayClosedEvent extends BaseEvent {
  type: EventType.DAY_CLOSED;
  idempotencyKey: string; // Format: ${userId}:${dayKey}:closed
}

export interface DayClosedVirtualEvent extends BaseEvent {
  type: EventType.DAY_CLOSED_VIRTUAL;
  // No idempotencyKey - synthetic events are never persisted
}

export interface DayActivityEvent extends BaseEvent {
  type: EventType.DAY_ACTIVITY;
  payload: {
    postsCount: number; // Number of posts on this day (up to appliedSeq)
  };
}

export type Event =
  | PostCreatedEvent
  | PostDeletedEvent
  | TimezoneChangedEvent
  | DayClosedEvent
  | DayClosedVirtualEvent
  | DayActivityEvent;
