import { MessageCircle } from 'lucide-react';
import { useNavigate } from '@/shared/navigation';
import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import { PREVIEW_POSTS, type PreviewPost } from '@/shared/preview-content/previewPosts';

// 후기 다음에 붙는 미리보기 peek. ~20개 중 재밌는 제목 위주로 8개만 손으로 골라 스와이프로 맛보게 하고,
// 마지막 더보기 카드와 헤더 링크로 전체 /preview로 넘어가게 한다.
const PEEK_POST_IDS = [
  '718edb41-bc7b-46cd-9853-beb85bf4f9ab', // 멋쩍은 자기소개
  '42bf1fa9-4396-45c6-af8e-bde6511bd967', // 댓글온도 높이는 꿀팁 푼다
  '7xlnIv7YIs9BHCs8SNiF', // 소신발언 : 포켓몬은 가짜다.
  'bc6e8407-aa3a-4cc5-9859-b459584c1f67', // 닭다리를 독식하는 인간들에 대한 글
  '87315dd3-d16e-4550-b7d5-9befdf9df675', // 매글프에게 치덕대는 글
  'cKuBvVv09YAtuwJwhyW1', // 막걸리
  '8011f7b5-4a72-4f39-8a6b-9a7bd8df3b0f', // 참을 인 세 번이면 살인도 막는다던데
  'iptLIIHsYNZtiv8nf4Cn', // 아이스크림 제조 공장장으로서
];

/** Curated peek posts in editorial order. Silently skips any id that drifts out of the shared content. */
export function selectPeekPosts(): PreviewPost[] {
  return PEEK_POST_IDS.map((id) => PREVIEW_POSTS.find((post) => post.id === id)).filter(
    (post): post is PreviewPost => Boolean(post),
  );
}

function PeekCard({ post, onOpen }: { post: PreviewPost; onOpen: () => void }) {
  return (
    <button
      type='button'
      onClick={onOpen}
      aria-label={`미리보기: ${post.title}`}
      className='reading-shadow reading-focus flex w-60 shrink-0 snap-start flex-col gap-2 rounded-lg border border-border/50 bg-card p-4 text-left transition-[transform,border-color] duration-200 hover:border-border active:scale-[0.99]'
    >
      <div className='flex items-center gap-2'>
        <ComposedAvatar
          size={24}
          src={post.author.profileImageURL}
          alt={post.author.displayName}
          fallback={post.author.displayName[0] || '?'}
        />
        <span className='truncate text-xs font-medium text-muted-foreground'>{post.author.displayName}</span>
      </div>
      <h3 className='line-clamp-2 text-pretty text-sm font-semibold leading-snug'>{post.title}</h3>
      <p className='line-clamp-2 text-xs leading-relaxed text-muted-foreground'>{post.contentPreview}</p>
      <div className='mt-auto flex items-center gap-1 pt-1 text-xs text-muted-foreground'>
        <MessageCircle className='size-3.5' />
        <span className='tabular-nums'>{post.countOfComments}</span>
      </div>
    </button>
  );
}

function MoreCard({ remaining, onOpen }: { remaining: number; onOpen: () => void }) {
  return (
    <button
      type='button'
      onClick={onOpen}
      aria-label='전체 미리보기로 이동'
      className='reading-focus flex w-60 shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/10 p-4 text-center transition-transform duration-200 active:scale-[0.99]'
    >
      <span className='text-sm font-semibold'>글 {remaining}개 더 있어요</span>
      <span className='text-xs font-medium text-ring'>전체 미리보기 →</span>
    </button>
  );
}

export function PreviewPeekSection() {
  const navigate = useNavigate();
  const peekPosts = selectPeekPosts();
  if (peekPosts.length === 0) return null;

  const remaining = Math.max(0, PREVIEW_POSTS.length - peekPosts.length);

  return (
    <section className='space-y-3 px-6'>
      <div className='flex items-baseline justify-between gap-4'>
        <h2 className='text-xl font-bold md:text-2xl'>이런 글들이 올라와요</h2>
        <button
          type='button'
          onClick={() => navigate('/preview')}
          className='reading-focus shrink-0 py-1 text-sm font-medium text-ring hover:underline'
        >
          전체 보기 →
        </button>
      </div>
      <div className='flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        {peekPosts.map((post) => (
          <PeekCard key={post.id} post={post} onOpen={() => navigate(`/preview/post/${post.id}`)} />
        ))}
        {remaining > 0 && <MoreCard remaining={remaining} onOpen={() => navigate('/preview')} />}
      </div>
    </section>
  );
}
