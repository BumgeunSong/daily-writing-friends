import { UserCommentingStats } from '@/stats/hooks/useCommentingStats'
import { UserCommentStatsCard } from './UserCommentStatsCard'

interface UserCommentStatsCardListProps {
  stats: UserCommentingStats[]
  currentUserId?: string
  onCardClick?: (userId: string) => void
}

export function UserCommentStatsCardList({ stats, currentUserId, onCardClick }: UserCommentStatsCardListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2">
      {stats.map((userStats) => (
        <UserCommentStatsCard
          key={userStats.user.id}
          stats={userStats}
          isCurrentUser={userStats.user.id === currentUserId}
          onClick={onCardClick ? () => onCardClick(userStats.user.id) : undefined}
        />
      ))}
    </div>
  )
} 