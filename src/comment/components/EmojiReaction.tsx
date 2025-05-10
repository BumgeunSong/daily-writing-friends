import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useLongPress } from "use-long-press"
import { Button } from "@/shared/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip"
import { useMediaQuery } from "@/comment/hooks/useMediaQuery"
import { ReactionUserDrawer } from "./ReactionUserDrawer"
import { ReactionUsersTooltip } from "./ReactionUserTooltip"
import type { ReactionUser } from "@/comment/model/Reaction"
import type React from "react"

interface EmojiReactionProps {
  content: string
  count: number
  users: ReactionUser[]
  currentUserId: string
  onDelete: (emoji: string, userId: string) => Promise<void>
}

const EmojiReaction: React.FC<EmojiReactionProps> = ({ content, count, users, currentUserId, onDelete }) => {
  const [loading, setLoading] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // 현재 사용자가 이 이모지에 반응했는지 확인
  const hasReacted = users.some((user) => user.userId === currentUserId)

  // 이모지 클릭 핸들러 - 웹과 모바일 모두에서 사용
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

  // 모바일에서 길게 누르면 드로어 열기
  const bind = useLongPress(
    () => {
      if (isMobile && count > 0) {
        setIsDrawerOpen(true)
      }
    },
    {
      threshold: 500, // 500ms 이상 누르면 활성화
      captureEvent: true,
      cancelOnMovement: true,
    },
  )

  // 드로어에서 삭제 처리
  const handleDrawerDelete = async (emoji: string, userId: string) => {
    try {
      await onDelete(emoji, userId)
      // 사용자가 삭제 후 남은 반응이 없으면 드로어 닫기
      if (users.length <= 1) {
        setIsDrawerOpen(false)
      }
    } catch (error) {
      console.error("드로어에서 반응 삭제 중 오류 발생:", error)
    }
  }

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={hasReacted ? "secondary" : "outline"}
              size="sm"
              className={`
                h-7 rounded-full px-2.5 py-0 text-sm transition-all
                ${
                  hasReacted
                    ? "border-transparent bg-secondary/80 shadow-sm hover:bg-secondary"
                    : "border border-muted-foreground/20 bg-background hover:bg-muted"
                }
                ${loading ? "opacity-70" : ""}
              `}
              onClick={handleClick}
              disabled={loading}
              {...bind()}
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <span className="flex items-center gap-1">
                  <span>{content}</span>
                  <span className="text-xs font-medium">{count}</span>
                </span>
              )}
            </Button>
          </TooltipTrigger>
          {/* 모바일이 아닐 때만 툴팁 표시 (호버 이벤트로 작동) */}
          {!isMobile && count > 0 && (
            <TooltipContent
              side="top"
              align="center"
              className="rounded-lg border border-border p-0 shadow-md"
              sideOffset={5}
            >
              <ReactionUsersTooltip users={users} />
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* 모바일용 드로어 (롱프레스로 열림) */}
      <ReactionUserDrawer
        emoji={content}
        users={users}
        currentUserId={currentUserId}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onDelete={handleDrawerDelete}
      />
    </>
  )
}

export default EmojiReaction

