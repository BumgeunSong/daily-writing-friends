import { UserPostingStatsCard } from './UserPostingStatsCard'
import { WritingStats } from '@/stats/model/WritingStats'

interface UserPostingStatsCardListProps {
  stats: WritingStats[]
  onCardClick?: (userId: string) => void
}

export function UserPostingStatsCardList({ stats, onCardClick }: UserPostingStatsCardListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2">
      {stats.map((userStats) => (
        <UserPostingStatsCard
          key={userStats.user.id}
          stats={userStats}
          onClick={onCardClick ? () => onCardClick(userStats.user.id) : undefined}
        />
      ))}
    </div>
  )
} 