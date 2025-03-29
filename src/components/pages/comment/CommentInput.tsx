import { Send, WifiOff } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/AuthContext"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CommentInputProps {
  initialValue?: string
  placeholder?: string
  onSubmit: (content: string) => Promise<void>
}

const CommentInput: React.FC<CommentInputProps> = ({ initialValue = "", placeholder, onSubmit }) => {
  const [newComment, setNewComment] = useState(initialValue)
  const { currentUser } = useAuth()
  const isOnline = useOnlineStatus()

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !newComment.trim() || !isOnline) return

    try {
      await onSubmit(newComment)
      setNewComment("")
    } catch (error) {
      console.error("댓글 추가 오류:", error)
    }
  }

  return (
    <div className="w-full">
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md mb-2 flex items-center">
          <WifiOff className="size-4 text-amber-600 dark:text-amber-400 mr-2" />
        </div>
      )}
      
      <form onSubmit={handleAddComment} className="flex w-full items-center space-x-4">
        <Textarea
          placeholder={placeholder || "재밌게 읽었다면 댓글로 글값을 남겨볼까요?"}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="flex-1 resize-none text-base"
          disabled={!isOnline}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!isOnline || !newComment.trim() || !currentUser}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </TooltipTrigger>
            {!isOnline && (
              <TooltipContent side="top">
                <p>오프라인 상태에서는 댓글을 작성할 수 없습니다</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </form>
    </div>
  )
}

export default CommentInput

