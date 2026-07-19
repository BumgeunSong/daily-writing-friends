import * as React from 'react';
import { cn } from '@/shared/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/shared/ui/Carousel';
import {
  PREVIEW_POSTS,
  type PreviewComment,
  type PreviewReply,
} from '@/shared/preview-content/previewPosts';

interface Voice {
  comment: PreviewComment;
  reply: PreviewReply;
  isReplyByPostAuthor: boolean;
}

// 손으로 고른 따뜻하고 재밌는 댓글-답글 짝. 실제 UI 대신 카드 캐러셀로 담백하게 보여준다.
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

function VoiceCard({ voice }: { voice: Voice }) {
  const { comment, reply, isReplyByPostAuthor } = voice;

  return (
    <div className='flex min-h-36 flex-col justify-center gap-3 px-1'>
      <div className='space-y-1'>
        <p className='text-pretty text-base leading-relaxed text-foreground'>{comment.body}</p>
        <p className='text-xs text-muted-foreground/70'>{comment.author.displayName}</p>
      </div>
      <div className='ml-3 space-y-1 rounded-lg bg-muted/50 px-3 py-2.5'>
        <p className='text-pretty text-sm leading-relaxed text-muted-foreground'>{reply.body}</p>
        <p className='text-xs text-muted-foreground/70'>
          {reply.author.displayName}
          {isReplyByPostAuthor && <span className='ml-1 text-muted-foreground/60'>· 글쓴이</span>}
        </p>
      </div>
    </div>
  );
}

export function CommunityVoicesCarousel() {
  const voices = resolveCommunityVoices();
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [api, setApi] = React.useState<CarouselApi>();

  React.useEffect(() => {
    if (!api) return;
    const handleSelect = () => setSelectedIndex(api.selectedScrollSnap());
    handleSelect();
    api.on('select', handleSelect);
    return () => {
      api.off('select', handleSelect);
    };
  }, [api]);

  if (voices.length === 0) return null;

  return (
    <div className='w-full space-y-4'>
      <Carousel opts={{ loop: true }} setApi={setApi} className='w-full'>
        <CarouselContent>
          {voices.map((voice) => (
            <CarouselItem key={voice.reply.id}>
              <VoiceCard voice={voice} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className='flex justify-center gap-2'>
        {voices.map((voice, index) => (
          <button
            key={voice.reply.id}
            type='button'
            onClick={() => api?.scrollTo(index)}
            className={cn(
              'size-2 rounded-full transition-[width,background-color]',
              selectedIndex === index ? 'w-6 bg-primary' : 'bg-muted-foreground/30',
            )}
            aria-label={`커뮤니티 대화 ${index + 1}번으로 이동`}
          />
        ))}
      </div>
    </div>
  );
}
