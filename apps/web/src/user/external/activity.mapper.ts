import type { Database } from '@/shared/external/database.types';

type Tables = Database['public']['Tables'];
type Views = Database['public']['Views'];

/** Shared `posts` embed selected by the commenting/replying joins. */
type PostEmbed = Pick<Tables['posts']['Row'], 'id' | 'title' | 'author_id' | 'board_id'>;

/** posting reads the `posts_feed` view, whose columns are all nullable. */
type PostingRow = Pick<
  Views['posts_feed']['Row'],
  'id' | 'board_id' | 'title' | 'content_length' | 'created_at'
>;

/** comments row + `posts!inner` embed (base tables → non-null identity). */
type CommentingRow = Pick<Tables['comments']['Row'], 'id' | 'content' | 'created_at' | 'post_id'> & {
  posts: PostEmbed | PostEmbed[];
};

/** replies row + `comments!inner` + `posts!inner` embeds. */
type ReplyingRow = Pick<
  Tables['replies']['Row'],
  'id' | 'created_at' | 'comment_id' | 'post_id' | 'user_id'
> & {
  comments: { id: string } | { id: string }[];
  posts: PostEmbed | PostEmbed[];
};

// Return shapes mirror the Firestore fan-out model kept for consumer compatibility.
export interface SupabasePosting {
  board: { id: string };
  post: { id: string; title: string; contentLength: number };
  createdAt: Date;
  isRecovered?: boolean;
}

export interface SupabaseCommenting {
  board: { id: string };
  post: { id: string; title: string; authorId: string };
  comment: { id: string; content: string };
  createdAt: Date;
}

export interface SupabaseReplying {
  board: { id: string };
  post: { id: string; title: string; authorId: string };
  comment: { id: string; authorId: string };
  reply: { id: string };
  createdAt: Date;
}

/**
 * Identity/temporal fields the DB guarantees NOT NULL but the `posts_feed` view
 * types as nullable. A null means a corrupt row, so we fail loud rather than emit
 * an empty id or an epoch-1970 `createdAt` (`new Date(null)`).
 */
function required<T>(value: T | null | undefined, field: string): T {
  if (value === null || value === undefined) {
    throw new Error(`posting row: missing required field '${field}'`);
  }
  return value;
}

/** PostgREST returns a to-one embed as an object, or as a 1-element array. */
function unwrapEmbed<T>(embed: T | T[]): T {
  return Array.isArray(embed) ? (embed as T[])[0] : (embed as T);
}

export function mapToPosting(row: PostingRow): SupabasePosting {
  return {
    board: { id: required(row.board_id, 'board_id') },
    post: {
      id: required(row.id, 'id'),
      title: row.title ?? '',
      contentLength: row.content_length ?? 0,
    },
    createdAt: new Date(required(row.created_at, 'created_at')),
  };
}

export function mapToCommenting(row: CommentingRow): SupabaseCommenting {
  const post = unwrapEmbed(row.posts);
  return {
    board: { id: post.board_id },
    post: { id: post.id, title: post.title, authorId: post.author_id },
    comment: { id: row.id, content: row.content },
    createdAt: new Date(row.created_at),
  };
}

export function mapToReplying(row: ReplyingRow): SupabaseReplying {
  const post = unwrapEmbed(row.posts);
  const comment = unwrapEmbed(row.comments);
  return {
    board: { id: post.board_id },
    post: { id: post.id, title: post.title, authorId: post.author_id },
    // comment author is not selected by the query (column ambiguity in the join).
    comment: { id: comment.id, authorId: '' },
    reply: { id: row.id },
    createdAt: new Date(row.created_at),
  };
}
