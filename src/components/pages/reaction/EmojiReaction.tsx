import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ReactionUser } from "@/types/Reaction"
import { Loader2 } from "lucide-react"
import { ReactionUsersTooltip } from "./ReactionUserTooltip"

interface EmojiReactionProps {
  content: string
  count: number
  users: ReactionUser[]
  currentUserId: string
  onDelete: (emoji: string, userId: string) => Promise<void>
}

const EmojiReaction: React.FC<EmojiReactionProps> = ({ content, count, users, currentUserId, onDelete }) => {
  const [loading, setLoading] = useState(false)

  // 현재 사용자가 이 이모지에 반응했는지 확인
  const hasReacted = users.some((user) => user.userId === currentUserId)

  // 이모지 클릭 핸들러
  const handleClick = async () => {
    if (hasReacted) {
      try {
        setLoading(true)
        await onDelete(content, currentUserId)
      } catch (error) {
        console.error("반응 삭제 중 오류 발생:", error)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={hasReacted ? "secondary" : "outline"}
            size="sm"
            className={`
              rounded-full h-7 px-2.5 py-0 text-sm border border-border
              ${hasReacted ? "bg-secondary/80 hover:bg-secondary" : "bg-background hover:bg-muted"}
            `}
            onClick={handleClick}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span className="flex items-center">
                <span className="mr-1">{content}</span>
                <span className="text-xs font-medium">{count}</span>
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="p-3">
          <ReactionUsersTooltip users={users} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default EmojiReaction

