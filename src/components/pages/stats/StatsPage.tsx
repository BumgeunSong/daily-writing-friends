import { ScrollArea } from "@/components/ui/scroll-area"
import { UserStatsCard } from "./UserStatsCard"
import { useWritingStats } from "@/hooks/useWritingStats"
import StatsHeader from "./StatsHeader"
import { StatsNoticeBanner } from "./StatsNoticeBanner"

export default function StatsPage() {
    const { writingStats, isLoading, error } = useWritingStats()
    
    if (isLoading) {
        return <LoadingState />
    }

    if (error) {
        return <ErrorState error={error} />
    }
    
    return (
        <div className="min-h-screen bg-background">
            <StatsHeader />
            <main className="container px-4 py-8">
                <ScrollArea className="h-[calc(100vh-16rem)]">
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

// LoadingState와 ErrorState 컴포넌트도 StatsHeader를 사용하도록 수정
function LoadingState() {
    return (
        <div className="min-h-screen bg-background">
            <StatsHeader />
            <main className="container px-4 py-8">
                <ScrollArea className="h-[calc(100vh-16rem)]">
                    <StatsNoticeBanner />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                        {[...Array(5)].map((_, index) => (
                            <div key={index} className="w-full bg-card rounded-lg">
                                <div className="flex items-start gap-4 p-4">
                                    {/* Left section with avatar and user info */}
                                    <div className="flex flex-1 items-start gap-4">
                                        {/* Avatar skeleton */}
                                        <div className="h-12 w-12 bg-muted rounded-full" />
                                        
                                        {/* User info skeleton */}
                                        <div className="flex flex-col gap-2">
                                            <div className="h-5 w-24 bg-muted rounded" />
                                            <div className="h-4 w-32 bg-muted rounded" />
                                        </div>
                                    </div>

                                    {/* Right section with contribution graph */}
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
                    We couldn't load the data. Please try again later.
                </p>
            </main>
        </div>
    )
}

