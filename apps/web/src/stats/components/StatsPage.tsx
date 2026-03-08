import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePerformanceMonitoring } from '@/shared/hooks/usePerformanceMonitoring';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';
import StatsHeader from '@/stats/components/StatsHeader';
import { StatsNoticeBanner } from '@/stats/components/StatsNoticeBanner';
import {
  StatsLoadingState,
  StatsErrorState,
} from '@/stats/components/StatsPageStates';
import { UserCommentStatsCardList } from '@/stats/components/UserCommentStatsCardList';
import { UserPostingStatsCardList } from '@/stats/components/UserPostingStatsCardList';
import { useStatsPageData } from '@/stats/hooks/useStatsPageData';

const STATS_SCROLL_ID = 'stats-scroll';

type TabType = 'posting' | 'commenting';

export default function StatsPage() {
  usePerformanceMonitoring('StatsPage');
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('posting');

  const {
    writingStats,
    commentingStats,
    currentUserId,
    currentUserWritingStats,
    currentUserCommentingStats,
    isCurrentUserWritingReady,
    isCurrentUserCommentingReady,
    otherUsersCount,
    isLoading,
    error,
    isLoadingCommenting,
  } = useStatsPageData(tab);

  const showInitialLoading = isLoading && !isCurrentUserWritingReady && !isCurrentUserCommentingReady;

  if (error) {
    return <StatsErrorState error={error instanceof Error ? error : new Error('알 수 없는 오류')} />;
  }

  if (showInitialLoading) {
    return <StatsLoadingState />;
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
                  <React.Suspense fallback={<StatsLoadingState />}>
                    <UserPostingStatsCardList
                      stats={writingStats || []}
                      currentUserStats={currentUserWritingStats}
                      currentUserId={currentUserId}
                      isCurrentUserReady={isCurrentUserWritingReady}
                      isLoadingOthers={isLoading}
                      otherUsersCount={otherUsersCount}
                      onCardClick={(userId) => navigate(`/user/${userId}`)}
                    />
                  </React.Suspense>
                </TabsContent>
              ) : (
                <TabsContent value='commenting'>
                  <React.Suspense fallback={<StatsLoadingState />}>
                    <UserCommentStatsCardList
                      stats={commentingStats || []}
                      currentUserStats={currentUserCommentingStats}
                      currentUserId={currentUserId}
                      isCurrentUserReady={isCurrentUserCommentingReady}
                      isLoadingOthers={isLoadingCommenting}
                      otherUsersCount={otherUsersCount}
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
