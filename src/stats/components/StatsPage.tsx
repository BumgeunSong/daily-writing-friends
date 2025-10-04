import { Loader2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { usePerformanceMonitoring } from '@/shared/hooks/usePerformanceMonitoring';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';
import StatsHeader from '@/stats/components/StatsHeader';
import { StatsNoticeBanner } from '@/stats/components/StatsNoticeBanner';
import { UserCommentStatsCardList } from '@/stats/components/UserCommentStatsCardList';
import { UserPostingStatsCardList } from '@/stats/components/UserPostingStatsCardList';
import { useStatsPageData } from '@/stats/hooks/useStatsPageData';

// 통계 페이지 스크롤 영역의 고유 ID
const STATS_SCROLL_ID = 'stats-scroll';

type TabType = 'posting' | 'commenting';

/**
 * Custom hook to fetch and manage data for the stats page.
 *
 * @param {TabType} tab - The active tab type, either 'posting' or 'commenting'.
 * @returns {Object} An object containing:
 *   - activeUsers: Array of active users in the board.
 *   - writingStats: Statistics related to user postings.
 *   - commentingStats: Statistics related to user comments.
 *   - isLoading: Boolean indicating if data is still loading.
 *   - error: Any error encountered during data fetching.
 *   - handleRefreshStats: Function to refresh the stats data.
 *   - navigate: Function to navigate between routes.
 *   - isLoadingCommenting: Boolean indicating if commenting stats are loading.
 */
export default function StatsPage() {
  usePerformanceMonitoring('StatsPage');
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('posting');

  const { value: statPageEnabled, isLoading: isConfigLoading } =
    useRemoteConfig('stat_page_enabled');

  const { writingStats, commentingStats, isLoading, error, isLoadingCommenting } =
    useStatsPageData(tab);

  // 통계 페이지가 비활성화된 경우 유지보수 알림 표시
  if (!isConfigLoading && !statPageEnabled) {
    return <MaintenanceState />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error instanceof Error ? error : new Error('알 수 없는 오류')} />;
  }

  return (
    <div className='min-h-screen bg-background'>
      <StatsHeader />
      <main className='container mx-auto px-3 py-2 md:px-4'>
        <ScrollArea className='h-full' id={STATS_SCROLL_ID}>
          <StatsNoticeBanner />
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabType)}>
            <TabsList className='mb-4 flex w-full justify-between rounded-lg bg-muted'>
              <TabsTrigger
                value='posting'
                className='data-[state=active]:reading-shadow reading-hover reading-focus flex-1 rounded-lg p-2 text-base transition-all duration-200 data-[state=active]:bg-background'
              >
                글쓰기
              </TabsTrigger>
              <TabsTrigger
                value='commenting'
                className='data-[state=active]:reading-shadow reading-hover reading-focus flex flex-1 items-center justify-center gap-2 rounded-lg p-2 text-base transition-all duration-200 data-[state=active]:bg-background'
              >
                댓글·답글
                {isLoadingCommenting && (
                  <Loader2 className='ml-1 size-4 animate-spin text-muted-foreground' />
                )}
              </TabsTrigger>
            </TabsList>
            <div className='mt-4'>
              {tab === 'posting' ? (
                <TabsContent value='posting'>
                  <React.Suspense fallback={<LoadingState />}>
                    <UserPostingStatsCardList
                      stats={writingStats || []}
                      onCardClick={(userId) => navigate(`/user/${userId}`)}
                    />
                  </React.Suspense>
                </TabsContent>
              ) : (
                <TabsContent value='commenting'>
                  <React.Suspense fallback={<LoadingState />}>
                    <UserCommentStatsCardList
                      stats={commentingStats || []}
                      onCardClick={(userId) => navigate(`/user/${userId}`)}
                    />
                  </React.Suspense>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </ScrollArea>
      </main>
    </div>
  );
}

// LoadingState 컴포넌트 - 스켈레톤 UI 표시
function LoadingState() {
  return (
    <div className='min-h-screen bg-background'>
      <StatsHeader />
      <main className='container mx-auto px-3 py-2 md:px-4'>
        <ScrollArea className='h-full' id={STATS_SCROLL_ID}>
          <StatsNoticeBanner />
          <div className='space-y-4 pb-20'>
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className='reading-shadow w-full rounded-lg border border-border/50 bg-card'
              >
                <div className='flex items-start gap-4 p-4'>
                  <div className='flex flex-1 items-start gap-4'>
                    <div className='size-12 rounded-full bg-muted' />
                    <div className='flex flex-col gap-2'>
                      <div className='h-5 w-24 rounded bg-muted' />
                      <div className='h-4 w-32 rounded bg-muted' />
                    </div>
                  </div>
                  <div className='flex flex-col items-end gap-2'>
                    <div className='grid w-24 grid-flow-col grid-rows-4 gap-1'>
                      {[...Array(20)].map((_, i) => (
                        <div key={i} className='aspect-square w-full rounded-sm bg-muted' />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

// MaintenanceState 컴포넌트 - 유지보수 알림 표시
function MaintenanceState() {
  return (
    <div className='min-h-screen bg-background'>
      <StatsHeader />
      <main className='container mx-auto px-3 py-2 md:px-4'>
        <ScrollArea className='h-full' id={STATS_SCROLL_ID}>
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
        </ScrollArea>
      </main>
    </div>
  );
}

// ErrorState 컴포넌트 - 오류 메시지 표시
function ErrorState({ error }: { error: Error }) {
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
