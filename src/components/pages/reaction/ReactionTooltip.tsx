import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ReactionUser {
  userId: string;
  userName: string;
  userProfileImage: string;
}

interface ReactionTooltipProps {
  emoji: string;
  users: ReactionUser[];
  currentUserId: string;
  onClick: () => void;
}

export const ReactionTooltip: React.FC<ReactionTooltipProps> = ({
  emoji,
  users,
  currentUserId,
  onClick
}) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div
            className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-sm
              bg-muted hover:bg-muted/80 transition-colors cursor-pointer
              ${users.some(user => user.userId === currentUserId) ? 'ring-1 ring-primary' : ''}
            `}
            onClick={onClick}
          >
            <span>{emoji}</span>
            <span className="text-xs text-muted-foreground">{users.length}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="p-2 max-w-xs">
          <div className="font-medium text-sm mb-1">
            {emoji} {users.length}명이 반응했습니다
          </div>
          <div className="py-1 max-h-60 overflow-y-auto">
            {users.map((user) => (
              <div key={user.userId} className="flex items-center gap-2 py-1">
                <Avatar className="size-6">
                  <AvatarImage src={user.userProfileImage} alt={user.userName} />
                  <AvatarFallback className="text-xs">{user.userName[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{user.userName}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}; 