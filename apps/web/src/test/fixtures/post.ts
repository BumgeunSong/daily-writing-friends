/**
 * Test fixture for the `posts_feed` PostgREST view row shape.
 *
 * `mapRowToPost` (post/api/post.ts) converts these snake_case rows into the
 * `Post` model. MSW handlers should return arrays of this shape — not `Post`
 * objects — to match what supabase-js receives over the wire.
 */
export interface PostRow {
  id: string;
  board_id: string;
  author_id: string;
  author_name: string;
  title: string;
  content_preview: string | null;
  thumbnail_image_url: string | null;
  visibility: 'public' | 'private';
  count_of_comments: number;
  count_of_replies: number;
  count_of_likes: number;
  engagement_score: number;
  week_days_from_first_day: number | null;
  created_at: string;
  updated_at: string;
  board_first_day: string | null;
  author_profile_photo_url: string | null;
}

export function makePostRow(overrides: Partial<PostRow> = {}): PostRow {
  return {
    id: 'p1',
    board_id: 'b1',
    author_id: 'u1',
    author_name: 'Alice',
    title: 'Test post',
    content_preview: 'body',
    thumbnail_image_url: null,
    visibility: 'public',
    count_of_comments: 0,
    count_of_replies: 0,
    count_of_likes: 0,
    engagement_score: 0,
    week_days_from_first_day: 0,
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
    board_first_day: null,
    author_profile_photo_url: null,
    ...overrides,
  };
}
