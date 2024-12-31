import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ContributionGraph } from "./ContributionGraph"
import { WritingStats } from "@/types/WritingStats"
import { WritingBadgeComponent } from "./WritingBadgeComponent"

interface UserStatsCardProps {
  stats: WritingStats
}

export function UserStatsCard({ stats }: UserStatsCardProps) {
    const { user, contributions } = stats

    return (
      <Card className="w-full">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="flex flex-1 items-start gap-4">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={user.profilePhotoURL || undefined} alt={user.nickname || "User"} />
              <AvatarFallback>{user.nickname?.[0] || user.realname?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5 min-w-0">
              <h3 className="font-semibold truncate">
                {user.nickname || user.realname || "Anonymous"}
              </h3>
              <div className="flex flex-wrap gap-1">
                {stats.badges.map((badge) => (
                  <WritingBadgeComponent key={badge.name} badge={badge} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <ContributionGraph 
              contributions={contributions} 
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>
    )
  }
