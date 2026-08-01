/**
 * Static preview content shown to logged-out prospects.
 *
 * The shapes here are intentionally decoupled from the real `Post`/`Comment`
 * models: each entry is hand-curated and pasted from the export pipeline
 * (design doc §5). The adapter in `../utils/toPostModel.ts` bridges these
 * shapes onto the reused presentational components.
 */

/** A preview-only author identity. IDs are synthetic (`pv-author-*`) so a visitor cannot probe `/user/:id`. */
export type PreviewAuthor = {
  id: string;
  displayName: string;
  profileImageURL: string;
};

/** A reply under a preview comment. `body` is pre-sanitized HTML exported at curation time. */
export type PreviewReply = {
  id: string;
  author: PreviewAuthor;
  /** Pre-sanitized HTML string. */
  body: string;
  /** ISO date string. */
  createdAt: string;
};

/** A top-level comment on a preview post. */
export type PreviewComment = {
  id: string;
  author: PreviewAuthor;
  /** Pre-sanitized HTML string. */
  body: string;
  /** ISO date string. */
  createdAt: string;
  replies: PreviewReply[];
};

/** A single handpicked preview post and its surrounding conversation. */
export type PreviewPost = {
  /** Used in URL: `/preview/post/:id`. Format decided at export time; accepts any string. */
  id: string;
  title: string;
  /** Pre-sanitized HTML string (full post body). */
  body: string;
  /** Plain-text or safe-HTML excerpt (~200 chars) rendered in the card's line-clamp. */
  contentPreview: string;
  author: PreviewAuthor;
  /** ISO date string. */
  createdAt: string;
  thumbnailImageURL: string | null;
  weekDaysFromFirstDay: number | null;
  /** Derived from `comments.length`. */
  countOfComments: number;
  /** Derived from `comments.flatMap(c => c.replies).length`. */
  countOfReplies: number;
  comments: PreviewComment[];
};

/** Raw preview post content; comment/reply tallies are derived, not stored. */
export type PreviewPostContent = Omit<PreviewPost, 'countOfComments' | 'countOfReplies'>;
