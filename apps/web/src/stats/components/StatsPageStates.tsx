import StatsHeader from '@/stats/components/StatsHeader';
import { StatsNoticeBanner } from '@/stats/components/StatsNoticeBanner';
import { UserPostingStatsCardSkeleton } from '@/stats/components/UserPostingStatsCardSkeleton';

const STATS_SCROLL_ID = 'stats-scroll';

export function StatsLoadingState() {
  return (
    <div className='min-h-screen bg-background'>
      <StatsHeader />
      <main className='container mx-auto px-3 py-2 md:px-4'>
        <div className='h-full overflow-y-auto' id={STATS_SCROLL_ID}>
          <StatsNoticeBanner />
          <div className='grid grid-cols-1 gap-4 pb-20 md:grid-cols-2'>
            {Array.from({ length: 5 }, (_, i) => (
              <UserPostingStatsCardSkeleton key={`loading-skeleton-${i}`} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export function StatsMaintenanceState() {
  return (
    <div className='min-h-screen bg-background'>
      <StatsHeader />
      <main className='container mx-auto px-3 py-2 md:px-4'>
        <div className='h-full overflow-y-auto' id={STATS_SCROLL_ID}>
          <div className='flex flex-col items-center justify-center space-y-6 py-16'>
            <img
              src='/admin-poodle-icon.webp'
              alt='점검 중인 강아지'
              className='size-24 rounded-full object-cover'
            />
            <div className='space-y-4 text-center'>
              <h2 className='text-2xl font-semibold text-foreground'>
                잔디 기록 페이지가 잠시 점검 중이에요
              </h2>
              <p className='max-w-md text-lg text-muted-foreground'>조금만 기다려주세요 🙏</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

interface StatsErrorStateProps {
  error: Error;
}

export function StatsErrorState({ error }: StatsErrorStateProps) {
  return (
    <div className='min-h-screen bg-background'>
      <StatsHeader />
      <main className='container mx-auto flex flex-col items-center justify-center px-3 py-8 md:px-4'>
        <h2 className='text-xl font-semibold text-red-600'>오류: {error.message}</h2>
        <p className='text-muted-foreground'>
          데이터를 불러올 수 없습니다. 나중에 다시 시도해주세요.
        </p>
      </main>
    </div>
  );
}
