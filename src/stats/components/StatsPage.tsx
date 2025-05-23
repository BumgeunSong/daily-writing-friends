import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useRegisterTabHandler } from "@/shared/contexts/BottomTabHandlerContext"
import { usePerformanceMonitoring } from "@/shared/hooks/usePerformanceMonitoring"
import { useRemoteConfig } from "@/shared/hooks/useRemoteConfig"
import { ScrollArea } from "@/shared/ui/scroll-area"
import StatsHeader from "@/stats/components/StatsHeader"
import { StatsNoticeBanner } from "@/stats/components/StatsNoticeBanner"
import { useWritingStatsV2 } from "@/stats/hooks/useWritingStatsV2"
import { useUserInBoard } from "@/user/hooks/useUserInBoard"
import { useNavigate } from "react-router-dom"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs"
import { useCommentingStats } from "@/stats/hooks/useCommentingStats"
import { UserPostingStatsCardList } from "@/stats/components/UserPostingStatsCardList"
import { UserCommentStatsCardList } from "@/stats/components/UserCommentStatsCardList"
import React from "react"
import { Loader2 } from "lucide-react"

// 통계 페이지 스크롤 영역의 고유 ID
const STATS_SCROLL_ID = 'stats-scroll';

type TabType = 'posting' | 'commenting';

function useStatsPageData(tab: TabType) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    
    // Remote Config에서 활성 게시판 ID 가져오기
    const { 
        value: activeBoardId, 
        isLoading: isLoadingConfig,
        error: configError
    } = useRemoteConfig<string>(
        'active_board_id', 
        '5rfpfRBuhRFZB13dJVy8' // 기본값을 문자열로 변경
    );
    
    // 활성 게시판 권한이 있는 사용자 가져오기
    const { users: activeUsers, isLoading: isLoadingUsers, error: usersError } = useUserInBoard(
      activeBoardId ? [activeBoardId] : []
    );

    // 사용자 ID 배열로 통계 가져오기
    const { 
        data: writingStats, 
        isLoading: isLoadingStats, 
        error: statsError 
    } = useWritingStatsV2(
        activeUsers.map((user) => user.uid)
    );

    const { 
        data: commentingStats, 
        isLoading: isLoadingCommenting, 
        error: commentingError 
    } = useCommentingStats(
        activeUsers.map((user) => user.uid)
    );
    
    const isLoading = isLoadingConfig || isLoadingUsers || (tab === 'posting' ? isLoadingStats : isLoadingCommenting);
    const error = configError || usersError || (tab === 'posting' ? statsError : commentingError);
    
    // 통계 새로고침 핸들러
    const handleRefreshStats = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // 2. 통계 관련 쿼리 캐시 무효화
        queryClient.invalidateQueries(['activeUsers', activeBoardId]);
        queryClient.invalidateQueries(['writingStatsV2']);
        queryClient.invalidateQueries(['commentingStats']);
    };
    
    // Stats 탭 핸들러 등록
    useRegisterTabHandler('Stats', handleRefreshStats);
    
    return {
        activeUsers,
        writingStats,
        commentingStats,
        isLoading,
        error,
        handleRefreshStats,
        navigate,
        isLoadingCommenting
    };
}

export default function StatsPage() {
    usePerformanceMonitoring('StatsPage');
    const [tab, setTab] = useState<TabType>('posting');
    const {
        writingStats,
        commentingStats,
        isLoading,
        error,
        handleRefreshStats,
        navigate,
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
            <main className="container flex-1 p-4">
                <ScrollArea className="h-full" id={STATS_SCROLL_ID}>
                    <StatsNoticeBanner />
                    <Tabs value={tab} onValueChange={v => setTab(v as TabType)}>
                        <TabsList className="w-full flex justify-between mb-4 rounded-lg bg-muted">
                            <TabsTrigger value="posting" className="flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg text-base p-2">글쓰기</TabsTrigger>
                            <TabsTrigger
                                value="commenting"
                                className="flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg text-base p-2 flex items-center justify-center gap-2"
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
            <main className="container flex-1 p-4">
                <ScrollArea className="h-full" id={STATS_SCROLL_ID}>
                    <StatsNoticeBanner />
                    <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2">
                        {[...Array(5)].map((_, index) => (
                            <div key={index} className="w-full rounded-lg bg-card">
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

