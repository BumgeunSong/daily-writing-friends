import type { WritingStats } from '@/stats/model/WritingStats'
import { UserPostingStatsCard } from './UserPostingStatsCard'
import { UserPostingStatsCardSkeleton } from './UserPostingStatsCardSkeleton'

interface UserPostingStatsCardListProps {
  stats: WritingStats[]
  currentUserStats?: WritingStats | null
  currentUserId?: string
  isCurrentUserReady?: boolean
  isLoadingOthers?: boolean
  otherUsersCount?: number
  onCardClick?: (userId: string) => void
}

export function UserPostingStatsCardList({
  stats,
  currentUserStats,
  currentUserId,
  isCurrentUserReady = false,
  isLoadingOthers = false,
  otherUsersCount = 0,
  onCardClick,
}: UserPostingStatsCardListProps) {
  // If all stats are loaded, show them directly
  if (!isLoadingOthers && stats.length > 0) {
    return (
      <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2">
        {stats.map((userStats) => (
          <UserPostingStatsCard
            key={userStats.user.id}
            stats={userStats}
            isCurrentUser={userStats.user.id === currentUserId}
            onClick={onCardClick ? () => onCardClick(userStats.user.id) : undefined}
          />
        ))}
      </div>
    )
  }

  // Progressive loading: show current user first, then skeletons
  return (
    <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2">
      {/* Current user's card (priority) */}
      {isCurrentUserReady && currentUserStats && (
        <UserPostingStatsCard
          key={currentUserStats.user.id}
          stats={currentUserStats}
          isCurrentUser={true}
          onClick={onCardClick ? () => onCardClick(currentUserStats.user.id) : undefined}
        />
      )}
      {!isCurrentUserReady && <UserPostingStatsCardSkeleton />}

      {/* Skeleton cards for other users */}
      {isLoadingOthers &&
        Array.from({ length: otherUsersCount }).map((_, index) => (
          <UserPostingStatsCardSkeleton key={`skeleton-${index}`} />
        ))}
    </div>
  )
} 