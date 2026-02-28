import { describe, it, expect } from 'vitest';
import { PostVisibility } from './Post';
import { mapRowToPost } from '@/shared/api/supabaseReads';

const baseRow = {
  id: 'p1', board_id: 'b1', author_id: 'u1', author_name: 'Test',
  title: 'Title', content: 'Body', content_json: null,
  thumbnail_image_url: null, visibility: null,
  count_of_comments: 0, count_of_replies: 0, count_of_likes: 0,
  engagement_score: 0, week_days_from_first_day: null,
  created_at: '2026-01-15T09:00:00Z', updated_at: '2026-01-15T09:00:00Z',
};

describe('mapRowToPost', () => {
  it('always provides createdAt as a Timestamp', () => {
    const post = mapRowToPost(baseRow);
    expect(post.createdAt).toBeDefined();
    expect(post.createdAt.toDate()).toBeInstanceOf(Date);
  });

  it('defaults visibility to PUBLIC when null', () => {
    const post = mapRowToPost(baseRow);
    expect(post.visibility).toBe(PostVisibility.PUBLIC);
  });

  it('preserves explicit visibility', () => {
    const post = mapRowToPost({ ...baseRow, visibility: 'private' });
    expect(post.visibility).toBe(PostVisibility.PRIVATE);
  });

  it('computes weekDaysFromFirstDay from embedded boards join', () => {
    const row = {
      ...baseRow,
      boards: { first_day: '2026-01-12T00:00:00Z' },
      created_at: '2026-01-14T09:00:00Z',
    };
    const post = mapRowToPost(row);
    expect(post.weekDaysFromFirstDay).toBe(2);
  });

  it('falls back to week_days_from_first_day column when no boards join', () => {
    const row = { ...baseRow, week_days_from_first_day: 7 };
    const post = mapRowToPost(row);
    expect(post.weekDaysFromFirstDay).toBe(7);
  });

  it('extracts authorProfileImageURL from joined users data', () => {
    const row = { ...baseRow, users: { profile_photo_url: 'https://cdn.example.com/avatar.jpg' } };
    const post = mapRowToPost(row);
    expect(post.authorProfileImageURL).toBe('https://cdn.example.com/avatar.jpg');
  });

  it('sets authorProfileImageURL to undefined when users join returns null profile', () => {
    const row = { ...baseRow, users: { profile_photo_url: null } };
    const post = mapRowToPost(row);
    expect(post.authorProfileImageURL).toBeUndefined();
  });
});
