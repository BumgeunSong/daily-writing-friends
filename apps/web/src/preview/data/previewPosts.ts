/**
 * Public entrypoint for static preview content shown to logged-out prospects.
 * Types live in ./previewTypes, authors in ./previewAuthors, and each post in ./posts.
 */
import type { PreviewPost, PreviewPostContent } from './previewTypes';
import { PREVIEW_POST_CONTENTS } from './posts';

export * from './previewTypes';
export { PREVIEW_AUTHORS } from './previewAuthors';

export const PREVIEW_BOARD_NAME = '매일 글쓰기 프렌즈 프리뷰';

function withCommentTallies(content: PreviewPostContent): PreviewPost {
  const countOfReplies = content.comments.reduce(
    (total, comment) => total + comment.replies.length,
    0,
  );
  return { ...content, countOfComments: content.comments.length, countOfReplies };
}

export const PREVIEW_POSTS: PreviewPost[] = PREVIEW_POST_CONTENTS.map(withCommentTallies);
