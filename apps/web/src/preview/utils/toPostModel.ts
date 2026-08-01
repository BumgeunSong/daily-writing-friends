import { createTimestamp } from '@/shared/model/Timestamp';
import { PostVisibility, type Post } from '@/post/model/Post';
import type { PreviewPost } from '@/shared/preview-content/previewPosts';

/**
 * Adapts a static {@link PreviewPost} onto the real {@link Post} model so the
 * reused presentational shells (`PostDetailHeader`, `PostContent`) can render it
 * unchanged (design doc §5).
 *
 * Only the fields the preview actually surfaces are populated; everything else
 * is a deliberately safe default chosen to keep the read-only preview inert:
 * - `boardId: 'preview'` — synthetic; the preview never links into a real board.
 * - `visibility: PUBLIC` — every preview post is public by definition.
 * - `countOfLikes: 0` — likes do not render on the preview.
 * - `weekDaysFromFirstDay` — coerced from `null` to `undefined` to match `Post`'s optional `number`.
 *
 * Optional `Post` fields not modeled by the preview (`contentJson`,
 * `engagementScore`, `updatedAt`) are intentionally omitted.
 */
export function toPostModel(previewPost: PreviewPost): Post {
  return {
    id: previewPost.id,
    title: previewPost.title,
    content: previewPost.body,
    contentPreview: previewPost.contentPreview,
    boardId: 'preview',
    authorId: previewPost.author.id,
    authorName: previewPost.author.displayName,
    authorProfileImageURL: previewPost.author.profileImageURL,
    visibility: PostVisibility.PUBLIC,
    thumbnailImageURL: previewPost.thumbnailImageURL,
    countOfComments: previewPost.countOfComments,
    countOfReplies: previewPost.countOfReplies,
    countOfLikes: 0,
    weekDaysFromFirstDay: previewPost.weekDaysFromFirstDay ?? undefined,
    createdAt: createTimestamp(new Date(previewPost.createdAt)),
  };
}
