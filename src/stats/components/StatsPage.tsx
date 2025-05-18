import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { useRegisterTabHandler } from "@/shared/contexts/BottomTabHandlerContext"
import { usePerformanceMonitoring } from "@/shared/hooks/usePerformanceMonitoring"
import { useRemoteConfig } from "@/shared/hooks/useRemoteConfig"
import { ScrollArea } from "@/shared/ui/scroll-area"
import StatsHeader from "@/stats/components/StatsHeader"
import { StatsNoticeBanner } from "@/stats/components/StatsNoticeBanner"
import { UserStatsCard } from "@/stats/components/UserStatsCard"
import { useWritingStatsV2 } from "@/stats/hooks/useWritingStatsV2"
import { useUserInBoard } from "@/user/hooks/useUserInBoard"

// 통계 페이지 스크롤 영역의 고유 ID
const STATS_SCROLL_ID = 'stats-scroll';

export default function StatsPage() {
    usePerformanceMonitoring('StatsPage');
    const queryClient = useQueryClient();
    
    // Remote Config에서 활성 게시판 ID 가져오기 (문자열로 타입 변경)
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
        activeUsers.map((user: any) => user.uid)
    );
    
    // 통계 새로고침 핸들러
    const handleRefreshStats = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // 2. 통계 관련 쿼리 캐시 무효화
        queryClient.invalidateQueries(['activeUsers', activeBoardId]);
        queryClient.invalidateQueries(['writingStatsV2']);
        
    }, [queryClient, activeBoardId]);
    
    // Stats 탭 핸들러 등록
    useRegisterTabHandler('Stats', handleRefreshStats);
    
    const isLoading = isLoadingConfig || isLoadingUsers || isLoadingStats;
    const error = configError || usersError || statsError;
    
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
                    <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2">
                        {writingStats?.map((stats) => (
                            <UserStatsCard key={stats.user.id} stats={stats} />
                        ))}
                    </div>
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

