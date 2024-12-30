import { ScrollArea } from "@/components/ui/scroll-area"
import { WritingStats } from "@/types/WritingStats"
import { UserStatsCard } from "./UserStatsCard"

interface StatsPageProps {
    writingStats: WritingStats[]
}

export default function StatsPage({ writingStats }: StatsPageProps) {
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
                        {writingStats.map((stats) => (
                            <UserStatsCard key={stats.user.id} stats={stats} />
                        ))}
                    </div>
                </ScrollArea>
            </main>
        </div>
    )
}

