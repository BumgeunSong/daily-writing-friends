import { UserCommentingStats } from '@/stats/hooks/useCommentingStats'
import { UserCommentStatsCard } from './UserCommentStatsCard'
import { UserPostingStatsCardSkeleton } from './UserPostingStatsCardSkeleton'

interface UserCommentStatsCardListProps {
  stats: UserCommentingStats[]
  currentUserStats?: UserCommentingStats | null
  currentUserId?: string
  isCurrentUserReady?: boolean
  isLoadingOthers?: boolean
  otherUsersCount?: number
  onCardClick?: (userId: string) => void
}

export function UserCommentStatsCardList({
  stats,
  currentUserStats,
  currentUserId,
  isCurrentUserReady = false,
  isLoadingOthers = false,
  otherUsersCount = 0,
  onCardClick,
}: UserCommentStatsCardListProps) {
  // If all stats are loaded, show them directly
  if (!isLoadingOthers && stats.length > 0) {
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

  // Progressive loading: show current user first, then skeletons
  return (
    <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2">
      {/* Current user's card (priority) */}
      {isCurrentUserReady && currentUserStats && (
        <UserCommentStatsCard
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