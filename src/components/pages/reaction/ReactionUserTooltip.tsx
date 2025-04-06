import type React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { ReactionUser } from "@/types/Reaction"

interface ReactionUsersTooltipProps {
  users: ReactionUser[]
}

export const ReactionUsersTooltip: React.FC<ReactionUsersTooltipProps> = ({ users }) => {
  return (
    <div className="w-64 max-w-xs">
      <div className="py-2 px-1 max-h-60 overflow-y-auto">
        {users.map((user) => (
          <div key={user.userId} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md">
            <Avatar className="h-6 w-6 border border-border/30">
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

