import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReactionUser } from "@/types/Reaction";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

interface EmojiReactionProps {
  content: string;
  count: number;
  users: ReactionUser[];
  currentUserId: string;
  onDelete: (emoji: string, userId: string) => Promise<void>;
}

const EmojiReaction: React.FC<EmojiReactionProps> = ({
  content,
  count,
  users,
  currentUserId,
  onDelete
}) => {
  const [loading, setLoading] = useState(false);
  
  // 현재 사용자가 이 이모지에 반응했는지 확인
  const hasReacted = users.some(user => user.userId === currentUserId);
  
  // 이모지 클릭 핸들러
  const handleClick = async () => {
    if (hasReacted) {
      try {
        setLoading(true);
        await onDelete(content, currentUserId);
      } catch (error) {
        console.error("반응 삭제 중 오류 발생:", error);
      } finally {
        setLoading(false);
      }
    }
  };
  
  // 사용자 목록 표시를 위한 툴팁 내용
  const tooltipContent = (
    <div className="flex flex-col gap-2 p-2 max-h-60 overflow-y-auto">
      <p className="text-sm font-semibold mb-1">반응한 사용자</p>
      {users.map(user => (
        <div key={user.userId} className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.userProfileImage} alt={user.userName} />
            <AvatarFallback>{user.userName.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{user.userName}</span>
        </div>
      ))}
    </div>
  );
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={hasReacted ? "secondary" : "outline"}
            size="sm"
            className="rounded-full px-3 py-1 h-8"
            onClick={handleClick}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="mr-1">{content}</span>
                <span className="text-xs">{count}</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default EmojiReaction;
