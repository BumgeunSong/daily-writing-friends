import { describe, it, expect } from 'vitest';
import type { Post } from '@/post/model/Post';
import type { BasicUserRow } from '@/user/api/userReads';
import type { UserIdRow, PostDateRow } from '@/stats/api/stats';
import {
  deduplicateAuthorIds,
  buildPostCardDataMap,
  type BuildPostCardDataMapInput,
} from './batchPostCardDataUtils';

function createMockPost(authorId: string, id = `post-${authorId}`): Post {
  return {
    id,
    boardId: 'board1',
    title: 'Test',
    content: '',
    thumbnailImageURL: null,
    authorId,
    authorName: 'Test Author',
    // FirebaseTimestamp shape via toDate(); the helper does not read createdAt here.
    createdAt: {
      toDate: () => new Date('2025-01-01T00:00:00Z'),
      seconds: 0,
      nanoseconds: 0,
    } as unknown as Post['createdAt'],
    countOfComments: 0,
    countOfReplies: 0,
    countOfLikes: 0,
    visibility: 'public' as Post['visibility'],
  };
}

function createUser(overrides: Partial<BasicUserRow> & { id: string }): BasicUserRow {
  return {
    id: overrides.id,
    real_name: overrides.real_name ?? null,
    nickname: overrides.nickname ?? null,
    profile_photo_url: overrides.profile_photo_url ?? null,
  };
}

function commentRow(user_id: string, created_at = '2025-01-01T12:00:00Z'): UserIdRow {
  return { user_id, created_at };
}

function postDateRow(author_id: string, created_at: string): PostDateRow {
  return { author_id, created_at };
}

function baseInput(overrides: Partial<BuildPostCardDataMapInput> = {}): BuildPostCardDataMapInput {
  return {
    authorIds: overrides.authorIds ?? [],
    users: overrides.users ?? [],
    commentRows: overrides.commentRows ?? [],
    replyRows: overrides.replyRows ?? [],
    postRows: overrides.postRows ?? [],
    streakWorkingDays: overrides.streakWorkingDays ?? [],
    donatorIds: overrides.donatorIds ?? new Set<string>(),
  };
}

describe('deduplicateAuthorIds', () => {
  it('returns unique author ids preserving first-seen order', () => {
    const posts = [
      createMockPost('a'),
      createMockPost('b'),
      createMockPost('a', 'post-a2'),
      createMockPost('c'),
    ];
    expect(deduplicateAuthorIds(posts)).toEqual(['a', 'b', 'c']);
  });

  it('drops falsy author ids', () => {
    const posts = [
      createMockPost(''),
      createMockPost('a'),
      createMockPost(''),
    ];
    expect(deduplicateAuthorIds(posts)).toEqual(['a']);
  });

  it('returns empty array for empty posts', () => {
    expect(deduplicateAuthorIds([])).toEqual([]);
  });
});

describe('buildPostCardDataMap', () => {
  describe('displayName fallback chain', () => {
    it('uses nickname when present', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1', nickname: 'Nick', real_name: 'Real' })],
        }),
      );
      expect(result.get('u1')?.authorData.displayName).toBe('Nick');
    });

    it('falls back to real_name when nickname is empty/whitespace', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1', nickname: '   ', real_name: 'Real' })],
        }),
      );
      expect(result.get('u1')?.authorData.displayName).toBe('Real');
    });

    it('falls back to "??" when both nickname and real_name are null', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1' })],
        }),
      );
      expect(result.get('u1')?.authorData.displayName).toBe('??');
    });

    it('trims surrounding whitespace from nickname', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1', nickname: '  Nick  ' })],
        }),
      );
      expect(result.get('u1')?.authorData.displayName).toBe('Nick');
    });

    it('uses "??" and blank image when user row is missing', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['missing'],
          users: [],
        }),
      );
      const entry = result.get('missing');
      expect(entry?.authorData.displayName).toBe('??');
      expect(entry?.authorData.profileImageURL).toBe('');
    });
  });

  describe('profile image', () => {
    it('passes through profile_photo_url', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1', profile_photo_url: 'https://img/u1.jpg' })],
        }),
      );
      expect(result.get('u1')?.authorData.profileImageURL).toBe('https://img/u1.jpg');
    });

    it('returns empty string when profile_photo_url is null', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1' })],
        }),
      );
      expect(result.get('u1')?.authorData.profileImageURL).toBe('');
    });
  });

  describe('badge temperature', () => {
    it('emits no badge when author has zero comments and replies', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1', nickname: 'Nick' })],
        }),
      );
      expect(result.get('u1')?.badges).toEqual([]);
    });

    it('emits a 36.5℃ badge for a single comment', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1', nickname: 'Nick' })],
          commentRows: [commentRow('u1')],
        }),
      );
      expect(result.get('u1')?.badges).toEqual([{ name: '36.5℃', emoji: '🌡️' }]);
    });

    it('sums comments and replies across both inputs', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1', nickname: 'Nick' })],
          // 6 comments + 5 replies = 11 → next 10-block adds 0.5 → 37.0℃
          commentRows: Array.from({ length: 6 }, () => commentRow('u1')),
          replyRows: Array.from({ length: 5 }, () => commentRow('u1')),
        }),
      );
      expect(result.get('u1')?.badges).toEqual([{ name: '37℃', emoji: '🌡️' }]);
    });

    it('scopes activity counts to each author', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1', 'u2'],
          users: [createUser({ id: 'u1' }), createUser({ id: 'u2' })],
          commentRows: [commentRow('u1'), commentRow('u2'), commentRow('u2')],
        }),
      );
      expect(result.get('u1')?.badges).toEqual([{ name: '36.5℃', emoji: '🌡️' }]);
      expect(result.get('u2')?.badges).toEqual([{ name: '36.5℃', emoji: '🌡️' }]);
    });
  });

  describe('streak boolean array', () => {
    it('matches each streakWorkingDays entry in order', () => {
      const day1 = new Date('2025-01-06T12:00:00+09:00'); // Mon KST
      const day2 = new Date('2025-01-07T12:00:00+09:00'); // Tue KST
      const day3 = new Date('2025-01-08T12:00:00+09:00'); // Wed KST

      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1' })],
          postRows: [
            postDateRow('u1', '2025-01-06T03:00:00Z'), // Mon KST 12:00
            postDateRow('u1', '2025-01-08T03:00:00Z'), // Wed KST 12:00
          ],
          streakWorkingDays: [day1, day2, day3],
        }),
      );

      expect(result.get('u1')?.streak).toEqual([true, false, true]);
    });

    it('returns all-false streak when author has no posts', () => {
      const day1 = new Date('2025-01-06T12:00:00+09:00');
      const day2 = new Date('2025-01-07T12:00:00+09:00');

      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1' })],
          streakWorkingDays: [day1, day2],
        }),
      );

      expect(result.get('u1')?.streak).toEqual([false, false]);
    });

    it('returns empty streak when streakWorkingDays is empty', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1' })],
        }),
      );
      expect(result.get('u1')?.streak).toEqual([]);
    });

    it('does not bleed posts from one author into another author’s streak', () => {
      const day1 = new Date('2025-01-06T12:00:00+09:00');

      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1', 'u2'],
          users: [createUser({ id: 'u1' }), createUser({ id: 'u2' })],
          postRows: [postDateRow('u1', '2025-01-06T03:00:00Z')],
          streakWorkingDays: [day1],
        }),
      );

      expect(result.get('u1')?.streak).toEqual([true]);
      expect(result.get('u2')?.streak).toEqual([false]);
    });
  });

  describe('isDonator', () => {
    it('is true when author id is in donatorIds set', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1' })],
          donatorIds: new Set(['u1', 'other']),
        }),
      );
      expect(result.get('u1')?.isDonator).toBe(true);
    });

    it('is false when author id is not in donatorIds set', () => {
      const result = buildPostCardDataMap(
        baseInput({
          authorIds: ['u1'],
          users: [createUser({ id: 'u1' })],
          donatorIds: new Set(['other']),
        }),
      );
      expect(result.get('u1')?.isDonator).toBe(false);
    });
  });

  it('returns a Map keyed by authorId with one entry per input id', () => {
    const result = buildPostCardDataMap(
      baseInput({
        authorIds: ['u1', 'u2', 'u3'],
        users: [createUser({ id: 'u1' }), createUser({ id: 'u2' })],
      }),
    );
    expect(result.size).toBe(3);
    expect(result.has('u1')).toBe(true);
    expect(result.has('u2')).toBe(true);
    expect(result.has('u3')).toBe(true);
  });

  it('returns an empty Map when authorIds is empty', () => {
    const result = buildPostCardDataMap(baseInput());
    expect(result.size).toBe(0);
  });
});
