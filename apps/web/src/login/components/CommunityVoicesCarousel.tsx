import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import {
  PREVIEW_POSTS,
  type PreviewComment,
  type PreviewReply,
} from '@/shared/preview-content/previewPosts';
import { cn } from '@/shared/utils';

interface Voice {
  comment: PreviewComment;
  reply: PreviewReply;
  isReplyByPostAuthor: boolean;
}

// 손으로 고른 따뜻하고 재밌는 댓글-답글 짝. 실제 대화처럼 채팅 카드로 담백하게 보여준다.
// 원문이 바뀌어도 어긋나지 않도록 답글 id로 shared preview 데이터에서 직접 해석한다.
const VOICE_REFS = [
  { postId: 'f675d197-9bf3-489a-947e-33ef6f2b6721', replyId: '2d3c9c68-92e9-492b-bfcd-a260aa8fbcf0' },
  { postId: '42bf1fa9-4396-45c6-af8e-bde6511bd967', replyId: '1fae5392-ac8f-4779-8bcc-477ccae0810f' },
  { postId: 'cWjTVRDguRoeIplV0deg', replyId: 'P8G1xSjrV6tEw3EgVjP3' },
  { postId: '42bf1fa9-4396-45c6-af8e-bde6511bd967', replyId: '60199b30-7d19-41c0-ba9a-8291ee66318a' },
];

export function resolveCommunityVoices(): Voice[] {
  return VOICE_REFS.map(({ postId, replyId }) => {
    const post = PREVIEW_POSTS.find((candidate) => candidate.id === postId);
    const comment = post?.comments.find((candidate) => candidate.replies.some((reply) => reply.id === replyId));
    const reply = comment?.replies.find((candidate) => candidate.id === replyId);
    if (!post || !comment || !reply) return null;
    return { comment, reply, isReplyByPostAuthor: reply.author.id === post.author.id };
  }).filter((voice): voice is Voice => voice !== null);
}

interface ChatMessageProps {
  name: string;
  imageUrl?: string;
  body: string;
  align: 'start' | 'end';
  isAuthor?: boolean;
}

function ChatMessage({ name, imageUrl, body, align, isAuthor = false }: ChatMessageProps) {
  const isReply = align === 'end';

  return (
    <div className={cn('flex flex-col gap-1', isReply ? 'items-end' : 'items-start')}>
      <div className={cn('flex items-center gap-1.5', isReply && 'flex-row-reverse')}>
        <ComposedAvatar size={20} src={imageUrl} alt={name} fallback={name[0] || '?'} />
        <span className='text-xs font-medium text-muted-foreground'>
          {name}
          {isAuthor && <span className='ml-1 text-muted-foreground/60'>· 글쓴이</span>}
        </span>
      </div>
      <p
        className={cn(
          'max-w-[85%] text-pretty px-3 py-2 text-sm leading-relaxed text-foreground',
          isReply ? 'rounded-2xl rounded-tr-sm bg-primary/10' : 'rounded-2xl rounded-tl-sm bg-muted',
        )}
      >
        {body}
      </p>
    </div>
  );
}

function VoiceCard({ voice }: { voice: Voice }) {
  const { comment, reply, isReplyByPostAuthor } = voice;

  return (
    <div className='reading-shadow flex w-72 shrink-0 snap-start flex-col gap-3 rounded-lg border border-border/50 bg-card p-4 md:w-80'>
      <ChatMessage
        name={comment.author.displayName}
        imageUrl={comment.author.profileImageURL}
        body={comment.body}
        align='start'
      />
      <ChatMessage
        name={reply.author.displayName}
        imageUrl={reply.author.profileImageURL}
        body={reply.body}
        align='end'
        isAuthor={isReplyByPostAuthor}
      />
    </div>
  );
}

export function CommunityVoicesCarousel() {
  const voices = resolveCommunityVoices();
  if (voices.length === 0) return null;

  return (
    <div className='flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
      {voices.map((voice) => (
        <VoiceCard key={voice.reply.id} voice={voice} />
      ))}
    </div>
  );
}
