import { ScrollArea } from "@/components/ui/scroll-area"
import { UserStatsCard } from "./UserStatsCard"
import { useWritingStatsV2 } from "@/hooks/useWritingStatsV2"
import StatsHeader from "./StatsHeader"
import { StatsNoticeBanner } from "./StatsNoticeBanner"
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring"
import { useQuery } from "@tanstack/react-query"
import { fetchAllUserDataWithBoardPermission } from "@/utils/userUtils"

const ACTIVE_BOARD_ID: string[] = ['Qs8RNvGqMBFLmIAkiLUS', 'AyvgJGwmf4MnOmAvz0xH']

export default function StatsPage() {
    usePerformanceMonitoring('StatsPage');
    const { 
        data: activeUsers, 
        isLoading: isLoadingUsers, 
        error: usersError 
    } = useQuery({
        queryKey: ['activeUsers', ACTIVE_BOARD_ID],
        queryFn: () => fetchAllUserDataWithBoardPermission(ACTIVE_BOARD_ID),
    });

    // 2. 사용자 ID 배열로 통계 가져오기
    const { 
        data: writingStats, 
        isLoading: isLoadingStats, 
        error: statsError 
    } = useWritingStatsV2(
        activeUsers?.map(user => user.uid) || []
    );
    
    const isLoading = isLoadingUsers || isLoadingStats;
    const error = usersError || statsError;
    
    if (isLoading) {
        return <LoadingState />
    }

    if (error) {
        return <ErrorState error={error instanceof Error ? error : new Error('Unknown error')} />
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

// LoadingState와 ErrorState 컴포넌트는 그대로 유지
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

function ErrorState({ error }: { error: Error }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <StatsHeader />
            <main className="container flex flex-col items-center justify-center py-8">
                <h2 className="text-xl font-semibold text-red-600">
                    Error: {error.message}
                </h2>
                <p className="text-muted-foreground">
                    데이터를 불러올 수 없습니다. 나중에 다시 시도해주세요.
                </p>
            </main>
        </div>
    )
}

