import type { ProseMirrorDoc } from '@/shared/model/ProseMirror';

/**
 * The `comments` row shape as the PostgREST select returns it, including the
 * embedded `author` join. Mirrors `COMMENT_SELECT` in comment.api.ts. `post_id`
 * is carried for handler-side `post_id=eq.` filtering even though the select
 * itself doesn't project it (extra fields are harmless to the mapper).
 */
export interface CommentRowWire {
  id: string;
  post_id: string;
  content: string;
  content_json: ProseMirrorDoc | null;
  user_id: string;
  user_name: string;
  user_profile_image: string;
  created_at: string;
  author: { profile_photo_url: string | null; nickname: string } | null;
}

/** The batch-reactions row shape (`comment_id` + REACTION_SELECT columns). */
export interface ReactionRowWire {
  comment_id: string;
  id: string;
  reaction_type: string;
  user_id: string;
  user_name: string;
  user_profile_image: string;
  created_at: string;
}

// Deterministic defaults. created_at sits before the gate's frozen clock
// (2025-01-01) so relative-time rendering ("N일 전") is stable across runs.
const DEFAULT_CREATED_AT = '2024-12-31T00:00:00.000Z';

export function makeCommentRow(overrides: Partial<CommentRowWire> = {}): CommentRowWire {
  return {
    id: 'c1',
    post_id: 'p1',
    content: '댓글 본문',
    content_json: null,
    user_id: '00000000-0000-4000-8000-000000000001',
    user_name: '댓글쓴이',
    user_profile_image: '',
    created_at: DEFAULT_CREATED_AT,
    author: { profile_photo_url: null, nickname: '댓글쓴이' },
    ...overrides,
  };
}

export function makeReactionRow(overrides: Partial<ReactionRowWire> = {}): ReactionRowWire {
  return {
    comment_id: 'c1',
    id: 'r1',
    reaction_type: '👍',
    user_id: '00000000-0000-4000-8000-000000000002',
    user_name: '반응한사람',
    user_profile_image: '',
    created_at: DEFAULT_CREATED_AT,
    ...overrides,
  };
}
