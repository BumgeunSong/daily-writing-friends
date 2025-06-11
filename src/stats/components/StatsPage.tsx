import { useState } from "react"
import { usePerformanceMonitoring } from "@/shared/hooks/usePerformanceMonitoring"
import { ScrollArea } from "@/shared/ui/scroll-area"
import StatsHeader from "@/stats/components/StatsHeader"
import { StatsNoticeBanner } from "@/stats/components/StatsNoticeBanner"
import { useStatsPageData } from "@/stats/hooks/useStatsPageData"
import { UserPostingStatsCardList } from "@/stats/components/UserPostingStatsCardList"
import { UserCommentStatsCardList } from "@/stats/components/UserCommentStatsCardList"
import React from "react"
import { Loader2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs"
import { useNavigate } from "react-router-dom"

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
    
    const {
        writingStats,
        commentingStats,
        isLoading,
        error,
        isLoadingCommenting
    } = useStatsPageData(tab);
    
    if (isLoading) {
        return <LoadingState />
    }

    if (error) {
        return <ErrorState error={error instanceof Error ? error : new Error('알 수 없는 오류')} />
    }
    
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <StatsHeader />
            <main className="container flex-1 px-3 md:px-4 py-2">
                <ScrollArea className="h-full" id={STATS_SCROLL_ID}>
                    <StatsNoticeBanner />
                    <Tabs value={tab} onValueChange={v => setTab(v as TabType)}>
                        <TabsList className="w-full flex justify-between mb-4 rounded-lg bg-muted">
                            <TabsTrigger value="posting" className="flex-1 data-[state=active]:bg-background data-[state=active]:reading-shadow rounded-lg text-base p-2 reading-hover reading-focus transition-all duration-200">글쓰기</TabsTrigger>
                            <TabsTrigger
                                value="commenting"
                                className="flex-1 data-[state=active]:bg-background data-[state=active]:reading-shadow rounded-lg text-base p-2 flex items-center justify-center gap-2 reading-hover reading-focus transition-all duration-200"
                            >
                                댓글·답글
                                {isLoadingCommenting && (
                                    <Loader2 className="ml-1 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                            </TabsTrigger>
                        </TabsList>
                        <div className="mt-4">
                          {tab === 'posting' ? (
                            <TabsContent value="posting">
                              <React.Suspense fallback={<LoadingState />}>
                                <UserPostingStatsCardList 
                                  stats={writingStats || []} 
                                  onCardClick={userId => navigate(`/user/${userId}`)}
                                />
                              </React.Suspense>
                            </TabsContent>
                          ) : (
                            <TabsContent value="commenting">
                              <React.Suspense fallback={<LoadingState />}>
                                <UserCommentStatsCardList 
                                  stats={commentingStats || []} 
                                  onCardClick={userId => navigate(`/user/${userId}`)}
                                />
                              </React.Suspense>
                            </TabsContent>
                          )}
                        </div>
                    </Tabs>
                </ScrollArea>
            </main>
        </div>
    )
}

// LoadingState 컴포넌트 - 스켈레톤 UI 표시
function LoadingState() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <StatsHeader />
            <main className="container flex-1 px-3 md:px-4 py-2">
                <ScrollArea className="h-full" id={STATS_SCROLL_ID}>
                    <StatsNoticeBanner />
                    <div className="space-y-4 pb-20">
                        {[...Array(5)].map((_, index) => (
                            <div key={index} className="w-full rounded-lg bg-card reading-shadow border border-border/50">
                                <div className="flex items-start gap-4 p-4">
                                    <div className="flex flex-1 items-start gap-4">
                                        <div className="size-12 rounded-full bg-muted" />
                                        <div className="flex flex-col gap-2">
                                            <div className="h-5 w-24 rounded bg-muted" />
                                            <div className="h-4 w-32 rounded bg-muted" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="grid w-24 grid-flow-col grid-rows-4 gap-1">
                                            {[...Array(20)].map((_, i) => (
                                                <div 
                                                    key={i} 
                                                    className="aspect-square w-full rounded-sm bg-muted"
                                                />
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
    )
}

// ErrorState 컴포넌트 - 오류 메시지 표시
function ErrorState({ error }: { error: Error }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <StatsHeader />
            <main className="container flex flex-col items-center justify-center py-8">
                <h2 className="text-xl font-semibold text-red-600">
                    오류: {error.message}
                </h2>
                <p className="text-muted-foreground">
                    데이터를 불러올 수 없습니다. 나중에 다시 시도해주세요.
                </p>
            </main>
        </div>
    )
}

