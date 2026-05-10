import { describe, it, expect } from 'vitest';
import { mapRowToPost } from './supabaseReads';
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
