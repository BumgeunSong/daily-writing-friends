import { ScrollArea } from "@/components/ui/scroll-area"
import { UserStatsCard } from "./UserStatsCard"
import { useWritingStats } from "@/hooks/useWritingStats"

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
            <header className="bg-primary py-4 text-primary-foreground">
                <div className="container">
                    <h1 className="text-2xl font-bold">Friends</h1>
                </div>
            </header>

            <main className="container py-8">
                <ScrollArea className="h-[calc(100vh-12rem)]">
                    <div className="space-y-4 pb-20">
                        {writingStats?.map((stats) => (
                            <UserStatsCard key={stats.user.id} stats={stats} />
                        ))}
                    </div>
                </ScrollArea>
            </main>
        </div>
    )
}

// Loading 상태 컴포넌트
function LoadingState() {
    return (
        <div className="min-h-screen bg-background">
            <header className="bg-primary py-4 text-primary-foreground">
                <div className="container">
                    <h1 className="text-2xl font-bold">Friends</h1>
                </div>
            </header>

            <main className="container py-8">
                <ScrollArea className="h-[calc(100vh-12rem)]">
                    <div className="space-y-4 pb-20">
                        {[...Array(5)].map((_, index) => (
                            <div key={index} className="animate-pulse flex items-start gap-4 p-4 bg-card rounded-md">
                                <div className="h-12 w-12 bg-muted rounded-full"></div>
                                <div className="flex flex-1 flex-col gap-2">
                                    <div className="h-4 bg-muted rounded w-1/3"></div>
                                    <div className="h-3 bg-muted rounded w-1/2"></div>
                                    <div className="mt-1 grid grid-cols-5 gap-1">
                                        {[...Array(20)].map((_, i) => (
                                            <div key={i} className="h-4 w-4 bg-muted rounded-sm"></div>
                                        ))}
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

// Error 상태 컴포넌트
function ErrorState({ error }: { error: Error }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <header className="bg-primary py-4 text-primary-foreground w-full">
                <div className="container">
                    <h1 className="text-2xl font-bold">Friends</h1>
                </div>
            </header>
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

