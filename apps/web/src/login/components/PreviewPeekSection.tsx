import { MessageCircle } from 'lucide-react';
import { useNavigate } from '@/shared/navigation';
import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import { SnapRow } from '@/shared/ui/SnapRow';
import { PREVIEW_POSTS, type PreviewPost } from '@/shared/preview-content/previewPosts';

// 후기 다음에 붙는 미리보기 peek. 전체 preview 글 중 매시간 8개를 뽑아 스와이프로 맛보게 하고,
// 마지막 더보기 카드와 헤더 링크로 전체 /preview로 넘어가게 한다.
const PEEK_COUNT = 8;
const MS_PER_HOUR = 3_600_000;

/**
 * 시(hour) 단위 시드. 같은 시간대의 모든 방문자가 동일한 값을 얻으므로 peek 목록이
 * 시간마다 한 번씩만 바뀌고 그 안에서는 안정적이다.
 */
function currentHourSeed(now: number = Date.now()): number {
  return Math.floor(now / MS_PER_HOUR);
}

/** mulberry32 — 작고 결정적인 시드 기반 PRNG. 같은 시드는 항상 같은 수열을 낸다. */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 시드 기반 Fisher–Yates 셔플. 입력을 변형하지 않는 순수 함수. */
function seededShuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 매시간 로테이션되는 peek 글 목록. 선택되는 글과 순서 모두 시(hour) 시드로 결정되므로
 * 같은 시간대 방문자는 같은 카드를 보고, 정각마다 전체 pool에서 새로 8개가 뽑힌다.
 * 시드/pool을 주입할 수 있어 순수 함수로 테스트할 수 있다.
 */
export function selectPeekPosts(
  seed: number = currentHourSeed(),
  pool: readonly PreviewPost[] = PREVIEW_POSTS,
): PreviewPost[] {
  return seededShuffle(pool, createSeededRandom(seed)).slice(0, PEEK_COUNT);
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
      <SnapRow>
        {peekPosts.map((post) => (
          <PeekCard key={post.id} post={post} onOpen={() => navigate(`/preview/post/${post.id}`)} />
        ))}
        {remaining > 0 && <MoreCard remaining={remaining} onOpen={() => navigate('/preview')} />}
      </SnapRow>
    </section>
  );
}
