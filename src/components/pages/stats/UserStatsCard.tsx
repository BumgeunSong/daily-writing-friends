import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ContributionGraph } from "./ContributionGraph"
import { WritingStats } from "@/types/WritingStats"

interface UserStatsCardProps {
  stats: WritingStats
}


export function UserStatsCard({ stats }: UserStatsCardProps) {
    const { user, contributions } = stats
    
    return (
      <Card className="w-full">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="flex flex-1 items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.profilePhotoURL || undefined} alt={user.nickname || "User"} />
              <AvatarFallback>{user.nickname?.[0] || user.realname?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <div>
                <h3 className="font-semibold">{user.nickname || user.realname || "Anonymous"}</h3>
                <p className="text-sm text-muted-foreground">{user.bio || "아직 자기소개가 없어요."}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ContributionGraph 
              contributions={contributions} 
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>
    )
  }
