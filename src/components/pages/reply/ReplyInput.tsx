import { Send, WifiOff } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/AuthContext"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ReplyInputProps {
  placeholder?: string
  initialValue?: string
  onSubmit: (content: string) => void
}

const ReplyInput: React.FC<ReplyInputProps> = ({ placeholder, initialValue = "", onSubmit }) => {
  const [newReply, setNewReply] = useState(initialValue)
  const { currentUser } = useAuth()
  const isOnline = useOnlineStatus()

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !newReply.trim() || !isOnline) return

    try {
      await onSubmit(newReply)
      setNewReply("")
    } catch (error) {
      console.error("답글 추가 오류:", error)
    }
  }

  return (
    <div className="w-full">
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md mb-2 flex items-center">
          <WifiOff className="size-4 text-amber-600 dark:text-amber-400 mr-2" />
        </div>
      )}
      
      <form onSubmit={handleAddReply} className="flex w-full items-center space-x-4">
        <Textarea
          placeholder={placeholder || "댓글을 달아줬다면 답을 해주는 게 인지상정!"}
          value={newReply}
          onChange={(e) => setNewReply(e.target.value)}
          className="flex-1 resize-none text-base"
          rows={3}
          disabled={!isOnline}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!isOnline || !newReply.trim() || !currentUser}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </TooltipTrigger>
            {!isOnline && (
              <TooltipContent side="top">
                <p>오프라인 상태에서는 답글을 작성할 수 없습니다</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </form>
    </div>
  )
}

export default ReplyInput

