import { Navigate, useNavigate, useParams } from '@/shared/navigation';
import { PostContent } from '@/post/components/PostContent';
import { PostDetailHeader } from '@/post/components/PostDetailHeader';
import { PostDetailLayout } from '@/post/components/PostDetailLayout';
import { PostMetaHelmet } from '@/post/components/PostMetaHelmet';
import type { PostAuthorData } from '@/post/components/PostUserProfile';
import { PreviewBackButton } from '@/preview/components/PreviewBackButton';
import { PreviewCommentList } from '@/preview/components/PreviewCommentList';
import { PREVIEW_POSTS } from '@/shared/preview-content/previewPosts';
import { toPostModel } from '@/preview/utils/toPostModel';

const noop = () => {};

/**
 * Static, read-only twin of {@link PostDetailPage} (design doc §3, §4, §6).
 * Reads `:previewPostId` from the route, finds the matching {@link PREVIEW_POSTS}
 * entry, and renders it through the reused presentational shells
 * (`PostDetailLayout`/`PostDetailHeader`/`PostContent`) — never the Supabase-backed
 * orchestrator.
 *
 * Comments and replies render read-only via {@link PreviewCommentList} in the
 * dedicated {@link PostDetailLayout.Comments} slot (design doc §9 step 4), which
 * sets the article/comments boundary. Interactive affordances stay off: no like
 * button, no adjacent prev/next, no comment input. No bottom CTA here — the
 * funnel CTA lives only on the board so the detail read stays uninterrupted.
 *
 * Navigation isolation (§4):
 * - the author profile is inert (no `onClickProfile`) — a jump to `/join` from
 *   tapping the author was unexpected; the join CTA carries that action instead,
 * - `isAuthor=false` plus omitted `boardId`/`postId` keep edit/delete hidden,
 * - an unknown `:previewPostId` redirects to `/preview` rather than 404ing.
 */
export default function PreviewPostDetailPage() {
  const { previewPostId } = useParams<{ previewPostId: string }>();
  const navigate = useNavigate();

  const previewPost = PREVIEW_POSTS.find((entry) => entry.id === previewPostId);

  // Invalid ID: redirect to the preview board synchronously during render
  // (design doc §3) — no 404 component. `<Navigate replace>` is React Router's
  // render-time redirect primitive; it swaps the history entry instead of
  // pushing, so the dead URL leaves no back-button trap.
  if (!previewPost) {
    return <Navigate to="/preview" replace />;
  }

  const post = toPostModel(previewPost);

  const authorData: PostAuthorData = {
    id: previewPost.author.id,
    displayName: previewPost.author.displayName,
    profileImageURL: previewPost.author.profileImageURL,
  };

  return (
    <PostDetailLayout>
      <PostMetaHelmet post={post} boardId={undefined} postId={undefined} />
      <PreviewBackButton className="mb-4" />
      <PostDetailLayout.Article>
        <PostDetailHeader
          post={post}
          authorData={authorData}
          isAuthorLoading={false}
          isDonator={false}
          badges={[]}
          streak={undefined}
          isStreakLoading={false}
          isAuthor={false}
          onDelete={noop}
          navigate={navigate}
        />
        <PostContent post={post} isAuthor={false} />
      </PostDetailLayout.Article>
      <PostDetailLayout.Comments>
        <PreviewCommentList comments={previewPost.comments} />
      </PostDetailLayout.Comments>
    </PostDetailLayout>
  );
}
