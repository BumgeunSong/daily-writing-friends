import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import type { ReactionUser } from "@/comment/model/Reaction"
import type React from "react"

interface ReactionUsersTooltipProps {
  users: ReactionUser[]
}

export const ReactionUsersTooltip: React.FC<ReactionUsersTooltipProps> = ({ users }) => {
  return (
    <div className="w-64 max-w-xs">
      <div className="max-h-60 overflow-y-auto px-1 py-2">
        {users.map((user) => (
          <div key={user.userId} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
            <Avatar className="size-6 border border-border/30">
              <AvatarImage src={user.userProfileImage} alt={user.userName} />
              <AvatarFallback className="text-xs">{user.userName.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user.userName}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

