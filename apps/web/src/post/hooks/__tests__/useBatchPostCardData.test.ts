import { describe, it, expect } from 'vitest';
import { buildPostCardDataMap, deduplicateAuthorIds } from '@/post/utils/batchPostCardDataUtils';
import type { Post } from '@/post/model/Post';
import { PostVisibility } from '@/post/model/Post';
import type { BasicUserRow } from '@/user/api/userReads';
import type { UserIdRow, PostDateRow } from '@/stats/api/stats';

const makePost = (overrides: Partial<Post> = {}): Post => ({
  id: 'post-1',
  authorId: 'user-1',
  authorName: '',
  boardId: 'board-1',
  title: 'Test',
  content: '',
  thumbnailImageURL: null,
  visibility: PostVisibility.PUBLIC,
  createdAt: { toDate: () => new Date('2026-04-20') } as Post['createdAt'],
  countOfComments: 0,
  countOfReplies: 0,
  countOfLikes: 0,
  ...overrides,
});

describe('deduplicateAuthorIds', () => {
  it('returns unique author IDs', () => {
    const posts = [
      makePost({ id: 'p1', authorId: 'user-1' }),
      makePost({ id: 'p2', authorId: 'user-2' }),
      makePost({ id: 'p3', authorId: 'user-1' }),
    ];
    expect(deduplicateAuthorIds(posts)).toEqual(['user-1', 'user-2']);
  });

  it('filters out empty author IDs', () => {
    const posts = [
      makePost({ id: 'p1', authorId: 'user-1' }),
      makePost({ id: 'p2', authorId: '' }),
    ];
    expect(deduplicateAuthorIds(posts)).toEqual(['user-1']);
  });

  it('returns empty array for empty posts', () => {
    expect(deduplicateAuthorIds([])).toEqual([]);
  });
});

describe('buildPostCardDataMap', () => {
  const workingDays = [
    new Date('2026-04-21'),
    new Date('2026-04-22'),
    new Date('2026-04-23'),
    new Date('2026-04-24'),
    new Date('2026-04-25'),
  ];

  describe('when author not found in users table', () => {
    it('returns fallback data with displayName "??" and empty profileImageURL', () => {
      const result = buildPostCardDataMap({
        authorIds: ['unknown-user'],
        users: [],
        commentRows: [],
        replyRows: [],
        postRows: [],
        streakWorkingDays: workingDays,
        donatorIds: new Set(),
      });

      const data = result.get('unknown-user');
      expect(data).toBeDefined();
      expect(data!.authorData.displayName).toBe('??');
      expect(data!.authorData.profileImageURL).toBe('');
    });
  });

  describe('when user exists with nickname', () => {
    it('uses nickname as displayName', () => {
      const users: BasicUserRow[] = [
        { id: 'user-1', nickname: 'Cool Nick', real_name: 'Real Name', profile_photo_url: 'https://photo.url' },
      ];

      const result = buildPostCardDataMap({
        authorIds: ['user-1'],
        users,
        commentRows: [],
        replyRows: [],
        postRows: [],
        streakWorkingDays: workingDays,
        donatorIds: new Set(),
      });

      expect(result.get('user-1')!.authorData.displayName).toBe('Cool Nick');
      expect(result.get('user-1')!.authorData.profileImageURL).toBe('https://photo.url');
    });
  });

  describe('when user has only real_name (no nickname)', () => {
    it('falls back to real_name', () => {
      const users: BasicUserRow[] = [
        { id: 'user-1', nickname: null, real_name: 'Real Name', profile_photo_url: null },
      ];

      const result = buildPostCardDataMap({
        authorIds: ['user-1'],
        users,
        commentRows: [],
        replyRows: [],
        postRows: [],
        streakWorkingDays: workingDays,
        donatorIds: new Set(),
      });

      expect(result.get('user-1')!.authorData.displayName).toBe('Real Name');
      expect(result.get('user-1')!.authorData.profileImageURL).toBe('');
    });
  });

  describe('when user has whitespace-only nickname', () => {
    it('falls back to real_name', () => {
      const users: BasicUserRow[] = [
        { id: 'user-1', nickname: '   ', real_name: 'Real Name', profile_photo_url: null },
      ];

      const result = buildPostCardDataMap({
        authorIds: ['user-1'],
        users,
        commentRows: [],
        replyRows: [],
        postRows: [],
        streakWorkingDays: workingDays,
        donatorIds: new Set(),
      });

      expect(result.get('user-1')!.authorData.displayName).toBe('Real Name');
    });
  });

  describe('when multiple authors requested but some missing', () => {
    it('returns data for all authors with fallback for missing ones', () => {
      const users: BasicUserRow[] = [
        { id: 'user-1', nickname: 'Alice', real_name: null, profile_photo_url: null },
      ];

      const result = buildPostCardDataMap({
        authorIds: ['user-1', 'user-missing'],
        users,
        commentRows: [],
        replyRows: [],
        postRows: [],
        streakWorkingDays: workingDays,
        donatorIds: new Set(),
      });

      expect(result.size).toBe(2);
      expect(result.get('user-1')!.authorData.displayName).toBe('Alice');
      expect(result.get('user-missing')!.authorData.displayName).toBe('??');
    });
  });

  describe('when comment and reply activity exists', () => {
    it('includes temperature badge', () => {
      const users: BasicUserRow[] = [
        { id: 'user-1', nickname: 'Alice', real_name: null, profile_photo_url: null },
      ];
      const commentRows: UserIdRow[] = [
        { user_id: 'user-1', created_at: '2026-04-21' },
        { user_id: 'user-1', created_at: '2026-04-22' },
      ];
      const replyRows: UserIdRow[] = [
        { user_id: 'user-1', created_at: '2026-04-23' },
      ];

      const result = buildPostCardDataMap({
        authorIds: ['user-1'],
        users,
        commentRows,
        replyRows,
        postRows: [],
        streakWorkingDays: workingDays,
        donatorIds: new Set(),
      });

      expect(result.get('user-1')!.badges.length).toBeGreaterThan(0);
    });
  });

  describe('when no activity exists', () => {
    it('returns empty badges', () => {
      const users: BasicUserRow[] = [
        { id: 'user-1', nickname: 'Alice', real_name: null, profile_photo_url: null },
      ];

      const result = buildPostCardDataMap({
        authorIds: ['user-1'],
        users,
        commentRows: [],
        replyRows: [],
        postRows: [],
        streakWorkingDays: workingDays,
        donatorIds: new Set(),
      });

      expect(result.get('user-1')!.badges).toEqual([]);
    });
  });

  describe('streak calculation', () => {
    it('maps working days to post dates', () => {
      const users: BasicUserRow[] = [
        { id: 'user-1', nickname: 'Alice', real_name: null, profile_photo_url: null },
      ];
      const postRows: PostDateRow[] = [
        { author_id: 'user-1', created_at: '2026-04-21T10:00:00Z' },
        { author_id: 'user-1', created_at: '2026-04-23T10:00:00Z' },
      ];

      const result = buildPostCardDataMap({
        authorIds: ['user-1'],
        users,
        commentRows: [],
        replyRows: [],
        postRows,
        streakWorkingDays: workingDays,
        donatorIds: new Set(),
      });

      const streak = result.get('user-1')!.streak;
      expect(streak).toHaveLength(5);
      expect(streak[0]).toBe(true);  // 04-21
      expect(streak[1]).toBe(false); // 04-22
      expect(streak[2]).toBe(true);  // 04-23
      expect(streak[3]).toBe(false); // 04-24
      expect(streak[4]).toBe(false); // 04-25
    });
  });

  describe('donator status', () => {
    it('marks author as donator when id is in donatorIds set', () => {
      const users: BasicUserRow[] = [
        { id: 'user-1', nickname: 'Alice', real_name: null, profile_photo_url: null },
        { id: 'user-2', nickname: 'Bob', real_name: null, profile_photo_url: null },
      ];

      const result = buildPostCardDataMap({
        authorIds: ['user-1', 'user-2'],
        users,
        commentRows: [],
        replyRows: [],
        postRows: [],
        streakWorkingDays: workingDays,
        donatorIds: new Set(['user-1']),
      });

      expect(result.get('user-1')!.isDonator).toBe(true);
      expect(result.get('user-2')!.isDonator).toBe(false);
    });
  });
});
