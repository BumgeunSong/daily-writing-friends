import { describe, it, expect } from 'vitest';
import { mapRowToPost, isWithinDays } from '../post';
import type { Post } from '@/post/model/Post';
import { PostVisibility } from '@/post/model/Post';

// Helper: minimal PostRowWithEmbeds shape for mapRowToPost
function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'post-1',
    board_id: 'board-1',
    author_id: 'user-1',
    author_name: 'Author',
    title: 'Test Post',
    thumbnail_image_url: null,
    visibility: 'public',
    count_of_comments: 3,
    count_of_replies: 1,
    count_of_likes: 5,
    engagement_score: 10,
    week_days_from_first_day: null,
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('mapRowToPost', () => {
  describe('content fallback', () => {
    it('uses full content when available (detail query)', () => {
      const row = makeRow({ content: '<p>Full HTML content</p>', content_preview: '<p>Full ' });
      const post = mapRowToPost(row);
      expect(post.content).toBe('<p>Full HTML content</p>');
    });

    it('falls back to content_preview when content is absent (feed query)', () => {
      const row = makeRow({ content_preview: '<p>Preview text</p>' });
      const post = mapRowToPost(row);
      expect(post.content).toBe('<p>Preview text</p>');
    });

    it('falls back to empty string when neither content nor content_preview exist', () => {
      const row = makeRow();
      const post = mapRowToPost(row);
      expect(post.content).toBe('');
    });
  });

  describe('denormalized counts', () => {
    it('uses count_of_comments and count_of_replies from row', () => {
      const row = makeRow({ count_of_comments: 7, count_of_replies: 3 });
      const post = mapRowToPost(row);
      expect(post.countOfComments).toBe(7);
      expect(post.countOfReplies).toBe(3);
    });

    it('defaults to 0 when counts are null', () => {
      const row = makeRow({ count_of_comments: null, count_of_replies: null });
      const post = mapRowToPost(row);
      expect(post.countOfComments).toBe(0);
      expect(post.countOfReplies).toBe(0);
    });

    it('prefers live embedded comment/reply counts over cached columns', () => {
      const row = makeRow({
        count_of_comments: 0,
        count_of_replies: 0,
        comments: [{ count: 5 }],
        replies: [{ count: 3 }],
      });
      const post = mapRowToPost(row);
      expect(post.countOfComments).toBe(5);
      expect(post.countOfReplies).toBe(3);
    });
  });

  describe('board embed handling', () => {
    it('computes weekDaysFromFirstDay when board embed has first_day', () => {
      // Mon Jan 12 → Wed Jan 15 = 3 working days
      const row = makeRow({
        boards: { first_day: '2026-01-12T00:00:00Z' },
        created_at: '2026-01-15T09:00:00Z',
      });
      const post = mapRowToPost(row);
      expect(post.weekDaysFromFirstDay).toBe(3);
    });

    it('uses row.week_days_from_first_day when board embed is absent', () => {
      const row = makeRow({ week_days_from_first_day: 5 });
      const post = mapRowToPost(row);
      expect(post.weekDaysFromFirstDay).toBe(5);
    });

    it('handles board embed as array (PostgREST format)', () => {
      const row = makeRow({
        boards: [{ first_day: '2026-01-12T00:00:00Z' }],
        created_at: '2026-01-15T09:00:00Z',
      });
      const post = mapRowToPost(row);
      expect(post.weekDaysFromFirstDay).toBe(3);
    });
  });

  describe('visibility', () => {
    it('maps visibility from row', () => {
      const row = makeRow({ visibility: 'private' });
      const post = mapRowToPost(row);
      expect(post.visibility).toBe(PostVisibility.PRIVATE);
    });

    it('defaults to PUBLIC when visibility is null', () => {
      const row = makeRow({ visibility: null });
      const post = mapRowToPost(row);
      expect(post.visibility).toBe(PostVisibility.PUBLIC);
    });
  });

  describe('user embed', () => {
    it('extracts profile photo from users embed', () => {
      const row = makeRow({ users: { profile_photo_url: 'https://example.com/photo.jpg' } });
      const post = mapRowToPost(row);
      expect(post.authorProfileImageURL).toBe('https://example.com/photo.jpg');
    });

    it('returns undefined when users embed is absent', () => {
      const row = makeRow();
      const post = mapRowToPost(row);
      expect(post.authorProfileImageURL).toBeUndefined();
    });
  });
});

function postWithCreatedAt(iso: string | null): Post {
  return {
    id: 'p1',
    boardId: 'b1',
    title: '',
    content: '',
    thumbnailImageURL: null,
    authorId: 'u1',
    authorName: '',
    createdAt: iso
      ? ({ toDate: () => new Date(iso) } as Post['createdAt'])
      : (null as unknown as Post['createdAt']),
    countOfComments: 0,
    countOfReplies: 0,
    countOfLikes: 0,
    visibility: PostVisibility.PUBLIC,
  };
}

describe('isWithinDays', () => {
  const now = new Date('2025-01-15T12:00:00Z');

  it('returns true for a post created today', () => {
    const post = postWithCreatedAt('2025-01-15T09:00:00Z');
    expect(isWithinDays(post, 7, now)).toBe(true);
  });

  it('returns true for a post exactly on the cutoff (days ago, same time)', () => {
    // cutoff = 2025-01-08T12:00:00Z; post at exactly that moment is >= → true
    const post = postWithCreatedAt('2025-01-08T12:00:00Z');
    expect(isWithinDays(post, 7, now)).toBe(true);
  });

  it('returns false for a post just past the cutoff', () => {
    // cutoff = 2025-01-08T12:00:00Z; one second earlier → false
    const post = postWithCreatedAt('2025-01-08T11:59:59Z');
    expect(isWithinDays(post, 7, now)).toBe(false);
  });

  it('returns false for a post well outside the window', () => {
    const post = postWithCreatedAt('2024-12-01T00:00:00Z');
    expect(isWithinDays(post, 7, now)).toBe(false);
  });

  it('returns false when createdAt is missing', () => {
    const post = postWithCreatedAt(null);
    expect(isWithinDays(post, 7, now)).toBe(false);
  });

  it('with days=0 only includes posts at or after `now` (cutoff = now)', () => {
    // cutoff equals now → posts before now are out, posts at/after now are in
    const before = postWithCreatedAt('2025-01-15T11:59:59Z');
    expect(isWithinDays(before, 0, now)).toBe(false);
    const atNow = postWithCreatedAt('2025-01-15T12:00:00Z');
    expect(isWithinDays(atNow, 0, now)).toBe(true);
  });

  it('does not mutate the injected now', () => {
    const post = postWithCreatedAt('2025-01-15T09:00:00Z');
    const snapshot = now.getTime();
    isWithinDays(post, 7, now);
    expect(now.getTime()).toBe(snapshot);
  });
});
