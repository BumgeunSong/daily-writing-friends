import { Timestamp } from 'firebase-admin/firestore';

export enum EventType {
  POST_CREATED = 'PostCreated',
  POST_DELETED = 'PostDeleted',
  TIMEZONE_CHANGED = 'TimezoneChanged',
  DAY_CLOSED = 'DayClosed',
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

export type Event = PostCreatedEvent | PostDeletedEvent | TimezoneChangedEvent | DayClosedEvent;
