import { ScrollArea } from "@/components/ui/scroll-area"
import { UserStatsCard } from "./UserStatsCard"
import { useWritingStatsV2 } from "@/hooks/useWritingStatsV2"
import StatsHeader from "./StatsHeader"
import { StatsNoticeBanner } from "./StatsNoticeBanner"
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchAllUserDataWithBoardPermission } from "@/utils/userUtils"
import { useRemoteConfig } from "@/hooks/useRemoteConfig"
import { useCallback } from "react"
import { useRegisterTabHandler } from "@/contexts/BottomTabHandlerContext"

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
    const { 
        data: activeUsers, 
        isLoading: isLoadingUsers, 
        error: usersError 
    } = useQuery({
        queryKey: ['activeUsers', activeBoardId],
        queryFn: () => fetchAllUserDataWithBoardPermission([activeBoardId]),
        enabled: !isLoadingConfig && !configError, // Remote Config 로드 완료 후 실행
    });

    // 사용자 ID 배열로 통계 가져오기
    const { 
        data: writingStats, 
        isLoading: isLoadingStats, 
        error: statsError 
    } = useWritingStatsV2(
        activeUsers?.map(user => user.uid) || []
    );
    
    // 통계 새로고침 핸들러
    const handleRefreshStats = useCallback(() => {
        // 1. 스크롤 위치를 최상단으로 이동
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
        <div className="min-h-screen flex flex-col bg-background">
            <StatsHeader />
            <main className="flex-1 container px-4 py-4">
                <ScrollArea className="h-full">
                    <StatsNoticeBanner />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
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
        <div className="min-h-screen flex flex-col bg-background">
            <StatsHeader />
            <main className="flex-1 container px-4 py-4">
                <ScrollArea className="h-full">
                    <StatsNoticeBanner />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                        {[...Array(5)].map((_, index) => (
                            <div key={index} className="w-full bg-card rounded-lg">
                                <div className="flex items-start gap-4 p-4">
                                    <div className="flex flex-1 items-start gap-4">
                                        <div className="h-12 w-12 bg-muted rounded-full" />
                                        <div className="flex flex-col gap-2">
                                            <div className="h-5 w-24 bg-muted rounded" />
                                            <div className="h-4 w-32 bg-muted rounded" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="w-24 grid grid-rows-4 grid-flow-col gap-1">
                                            {[...Array(20)].map((_, i) => (
                                                <div 
                                                    key={i} 
                                                    className="aspect-square w-full bg-muted rounded-sm"
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
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

