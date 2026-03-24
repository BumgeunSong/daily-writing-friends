import { describe, it, expect } from 'vitest';
import { computeWeekDaysFromFirstDay, mapRowToPost } from './supabaseReads';
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

describe('computeWeekDaysFromFirstDay', () => {
  it('returns 0 for same-day post', () => {
    expect(computeWeekDaysFromFirstDay('2026-01-12T00:00:00Z', '2026-01-12T09:00:00Z')).toBe(0);
  });

  it('counts weekdays only, excluding weekends', () => {
    // Mon Jan 12 → Fri Jan 16 = 4 working days (Mon, Tue, Wed, Thu)
    expect(computeWeekDaysFromFirstDay('2026-01-12T00:00:00Z', '2026-01-16T00:00:00Z')).toBe(4);
  });

  it('skips Saturday and Sunday', () => {
    // Mon Jan 12 → Mon Jan 19 = 5 working days (Mon-Fri, skip Sat+Sun)
    expect(computeWeekDaysFromFirstDay('2026-01-12T00:00:00Z', '2026-01-19T00:00:00Z')).toBe(5);
  });

  it('handles two full weeks', () => {
    expect(computeWeekDaysFromFirstDay('2026-01-12T00:00:00Z', '2026-01-26T00:00:00Z')).toBe(10);
  });

  it('handles cross-month boundary', () => {
    expect(computeWeekDaysFromFirstDay('2026-01-26T00:00:00Z', '2026-02-02T00:00:00Z')).toBe(5);
  });

  it('handles start on weekend correctly', () => {
    // Sat Jan 10 → Mon Jan 12 = 0 working days (Sat, Sun are skipped)
    expect(computeWeekDaysFromFirstDay('2026-01-10T00:00:00Z', '2026-01-12T00:00:00Z')).toBe(0);
  });

  it('handles cross-year boundary', () => {
    // Wed Dec 31 → Fri Jan 2 = 2 working days (Wed→Thu, Thu→Fri)
    expect(computeWeekDaysFromFirstDay('2025-12-31T00:00:00Z', '2026-01-02T00:00:00Z')).toBe(2);
  });

  it('is safe across KST/UTC boundary (KST projection)', () => {
    // First day: 2026-01-01T00:00:00+09:00 (KST) = 2025-12-31T15:00:00Z
    // Created at: 2026-01-02T00:00:01+09:00 (KST) = 2026-01-01T15:00:01Z
    // Exactly one KST weekday has elapsed between these instants.
    expect(
      computeWeekDaysFromFirstDay('2025-12-31T15:00:00Z', '2026-01-01T15:00:01Z'),
    ).toBe(1);
  });
});

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
