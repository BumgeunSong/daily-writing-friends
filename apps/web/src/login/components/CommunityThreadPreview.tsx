import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import {
  PREVIEW_POSTS,
  type PreviewAuthor,
  type PreviewComment,
  type PreviewPost,
} from '@/shared/preview-content/previewPosts';

// 같이 쓰기 카드에 붙이는 대표 스레드. 유료 독서 모임 경험자가 매글프가 더 좋다고 말하고,
// 글쓴이가 따뜻하게 되받는 주고받는 대화라 "무료인데 이렇게 따뜻하다"를 잘 전달한다.
// 이 스레드의 본문은 평문이라 sanitizer 없이 텍스트로 그대로 렌더한다.
const FEATURED_POST_ID = '87315dd3-d16e-4550-b7d5-9befdf9df675';
const FEATURED_COMMENT_ID = 'ec30886b-7962-4636-a719-f612417dfbb5';

export interface CommunityThread {
  post: PreviewPost;
  comment: PreviewComment;
}

/** Resolves the hand-picked thread from the shared preview content. Returns null if curation drifts. */
export function resolveCommunityThread(): CommunityThread | null {
  const post = PREVIEW_POSTS.find((candidate) => candidate.id === FEATURED_POST_ID);
  const comment = post?.comments.find((candidate) => candidate.id === FEATURED_COMMENT_ID);
  if (!post || !comment) return null;
  return { post, comment };
}

function AuthorBadge() {
  return (
    <span className='rounded-full bg-foreground/10 px-1.5 py-0.5 text-[0.65rem] font-medium leading-none text-foreground'>
      글쓴이
    </span>
  );
}

function ThreadEntry({ author, body, isPostAuthor }: { author: PreviewAuthor; body: string; isPostAuthor: boolean }) {
  return (
    <div className='space-y-1.5'>
      <div className='flex items-center gap-2'>
        <ComposedAvatar
          size={24}
          src={author.profileImageURL}
          alt={author.displayName}
          fallback={author.displayName[0] || '?'}
        />
        <span className='text-sm font-semibold leading-none'>{author.displayName}</span>
        {isPostAuthor && <AuthorBadge />}
      </div>
      <p className='whitespace-pre-wrap text-pretty text-sm leading-relaxed text-muted-foreground'>{body}</p>
    </div>
  );
}

export function CommunityThreadPreview() {
  const thread = resolveCommunityThread();
  if (!thread) return null;

  const { post, comment } = thread;

  return (
    <div className='w-full space-y-3 py-2'>
      <ThreadEntry author={comment.author} body={comment.body} isPostAuthor={comment.author.id === post.author.id} />
      <div className='space-y-3 border-l-2 border-border pl-4'>
        {comment.replies.map((reply) => (
          <ThreadEntry
            key={reply.id}
            author={reply.author}
            body={reply.body}
            isPostAuthor={reply.author.id === post.author.id}
          />
        ))}
      </div>
    </div>
  );
}
