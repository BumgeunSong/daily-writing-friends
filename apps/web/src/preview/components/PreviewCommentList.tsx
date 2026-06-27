import { CommentHeader } from '@/comment/components/CommentHeader';
import { renderCommentBodyHtml } from '@/post/web/contentUtils';
import type { PreviewComment, PreviewReply } from '@/preview/data/previewPosts';

/**
 * Formats a snapshot ISO date as `YYYY. MM. dd`. The preview is a frozen
 * capture, so comments show an absolute date rather than a relative "N일 전"
 * that would drift against the viewer's clock.
 */
function formatSnapshotDate(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}. ${month}. ${day}`;
}

/**
 * Static, read-only twin of the real comment section (design doc §4, §9 step 4).
 *
 * Mirrors how `CommentRow`/`ReplyRow` render a pre-sanitized body — the same
 * `renderCommentBodyHtml` pass into a `prose` block — but drops every
 * interactive affordance the real rows carry: no reaction list, no reply input,
 * no expand toggle, no edit/delete. Replies render inline and always-visible.
 *
 * Two preview-specific adaptations (design doc §5):
 * - `badges={[]}` short-circuits `CommentHeader`'s `usePostProfileBadges` fetch,
 *   so the synthetic `pv-author-*` IDs never hit Supabase.
 * - `timeLabel` passes an absolute `YYYY. MM. dd` date instead of relying on
 *   `CommentHeader`'s default relative time — the snapshot must not drift to
 *   "N일 전" against the viewer's clock.
 */

function PreviewBody({ body }: { body: string }) {
  // `renderCommentBodyHtml` runs the same sanitizer the real comment rows use,
  // so the pre-sanitized export HTML stays valid input and is re-sanitized here.
  return (
    <div className='text-base'>
      <div
        className='prose prose-slate whitespace-pre-wrap dark:prose-invert'
        dangerouslySetInnerHTML={{ __html: renderCommentBodyHtml(body) }}
      />
    </div>
  );
}

function PreviewReplyRow({ reply }: { reply: PreviewReply }) {
  return (
    <div className='flex flex-col space-y-3 pb-4'>
      <CommentHeader
        userId={reply.author.id}
        timeLabel={formatSnapshotDate(reply.createdAt)}
        fallbackName={reply.author.displayName}
        fallbackProfileImage={reply.author.profileImageURL}
        badges={[]}
      />
      <PreviewBody body={reply.body} />
    </div>
  );
}

function PreviewReplyList({ replies }: { replies: PreviewReply[] }) {
  if (replies.length === 0) return null;

  return (
    <div className='mt-6 border-l-2 border-border pl-4'>
      {replies.map((reply) => (
        <PreviewReplyRow key={reply.id} reply={reply} />
      ))}
    </div>
  );
}

function PreviewCommentRow({ comment }: { comment: PreviewComment }) {
  return (
    <div className='flex flex-col space-y-3 pb-4'>
      <CommentHeader
        userId={comment.author.id}
        timeLabel={formatSnapshotDate(comment.createdAt)}
        fallbackName={comment.author.displayName}
        fallbackProfileImage={comment.author.profileImageURL}
        badges={[]}
      />
      <PreviewBody body={comment.body} />
      <div className='flex flex-col space-y-1'>
        <PreviewReplyList replies={comment.replies} />
      </div>
    </div>
  );
}

export function PreviewCommentList({ comments }: { comments: PreviewComment[] }) {
  if (comments.length === 0) return null;

  return (
    <section className='border-t border-border pt-8'>
      <h2 className='mb-6 text-base font-semibold text-foreground'>댓글 {comments.length}</h2>
      <div className='space-y-6'>
        {comments.map((comment) => (
          <PreviewCommentRow key={comment.id} comment={comment} />
        ))}
      </div>
    </section>
  );
}
