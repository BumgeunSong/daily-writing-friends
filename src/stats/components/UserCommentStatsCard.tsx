import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Card, CardContent } from '@/shared/ui/card'
import { UserCommentingStats } from "@/stats/hooks/useCommentingStats"
import { ContributionGraph } from "./ContributionGraph"
import { Contribution } from '@/stats/model/WritingStats'

interface UserCommentStatsCardProps {
  stats: UserCommentingStats
  onClick?: () => void
}

// CommentingContribution[] -> Contribution[] 변환
function toContributionArray(commenting: { createdAt: string; countOfCommentAndReplies: number | null }[]): Contribution[] {
  return commenting.map(c => ({
    createdAt: c.createdAt,
    contentLength: c.countOfCommentAndReplies
  }))
}

export function UserCommentStatsCard({ stats, onClick }: UserCommentStatsCardProps) {
    const { user, contributions } = stats
    const postingContributions = toContributionArray(contributions)

    return (
      <Card className="w-full">
        <CardContent
          className="flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/40 transition"
          onClick={onClick}
          role={onClick ? 'button' : undefined}
          tabIndex={onClick ? 0 : undefined}
        >
          <div className="flex flex-1 items-start gap-4">
            <Avatar className="size-12 shrink-0">
              <AvatarImage src={user.profilePhotoURL || undefined} alt={user.nickname || "User"} />
              <AvatarFallback>{user.nickname?.[0] || user.realname?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h3 className="truncate font-semibold">
                {user.nickname || user.realname || "Anonymous"}
              </h3>
              {/* bio 등 추가 정보 필요시 여기에 */}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <ContributionGraph 
              contributions={postingContributions} 
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>
    )
  } 