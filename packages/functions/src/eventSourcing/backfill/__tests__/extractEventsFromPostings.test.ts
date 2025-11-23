import { describe, it, expect } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import {
  extractEventsFromPostings,
  PostingDocument,
} from '../extractEventsFromPostings';
import { EventType, PostCreatedEvent } from '../../types/Event';

describe('Event Extraction (Functional Core - Full Rebuild)', () => {
  describe('extractEventsFromPostings', () => {
    describe('when given valid postings', () => {
      it('creates events with sequential seq numbers starting from 1', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post1', contentLength: 100 },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          },
          {
            post: { id: 'post2', contentLength: 200 },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect(events).toHaveLength(2);
        expect(events[0].seq).toBe(1);
        expect(events[1].seq).toBe(2);
      });

      it('uses custom starting seq number', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post1', contentLength: 100 },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 10);

        expect(events[0].seq).toBe(10);
      });

      it('computes dayKey in user timezone', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post1', contentLength: 100 },
            board: { id: 'board1' },
            // UTC: 2024-01-15 23:00 → Seoul (UTC+9): 2024-01-16 08:00
            createdAt: Timestamp.fromDate(new Date('2024-01-15T23:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect(events[0].dayKey).toBe('2024-01-16');
      });

      it('creates POST_CREATED events with correct payload', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post123', contentLength: 500 },
            board: { id: 'board456' },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect(events[0]).toMatchObject({
          type: EventType.POST_CREATED,
          payload: {
            postId: 'post123',
            boardId: 'board456',
            contentLength: 500,
          },
        });
      });
    });

    describe('when postings have missing fields', () => {
      it('skips postings with missing post.id', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: '', contentLength: 100 },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          },
          {
            post: { id: 'post2', contentLength: 200 },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect(events).toHaveLength(1);
        expect((events[0] as PostCreatedEvent).payload.postId).toBe('post2');
      });

      it('skips postings with missing createdAt', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post1', contentLength: 100 },
            board: { id: 'board1' },
            createdAt: null as any,
          },
          {
            post: { id: 'post2', contentLength: 200 },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect(events).toHaveLength(1);
        expect((events[0] as PostCreatedEvent).payload.postId).toBe('post2');
      });

      it('uses "unknown" for missing boardId', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post1', contentLength: 100 },
            board: { id: '' },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect((events[0] as PostCreatedEvent).payload.boardId).toBe('unknown');
      });

      it('uses 0 for missing contentLength', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post1', contentLength: undefined as any },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect((events[0] as PostCreatedEvent).payload.contentLength).toBe(0);
      });
    });

    describe('when postings array is empty', () => {
      it('returns empty array', () => {
        const events = extractEventsFromPostings([], 'Asia/Seoul', 1);

        expect(events).toEqual([]);
      });
    });
  });
});
