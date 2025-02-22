import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { addReplyToComment } from "@/utils/commentUtils"
import ReplyInput from "./ReplyInput"
import ReplyList from "./ReplyList"
import { fetchReplyCount } from "@/utils/replyUtils"
import { MessageCircle } from "lucide-react"
import ReplyPrompt from "./ReplyPrompt"


interface RepliesProps {
  boardId: string
  postId: string
  commentId: string
}

const Replies: React.FC<RepliesProps> = ({ boardId, postId, commentId }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [replyCount, setReplyCount] = useState<number>(0)
  const { currentUser } = useAuth()

  const handleSubmit = async (content: string) => {
    if (!currentUser) return
    await addReplyToComment(
      boardId,
      postId,
      commentId,
      content,
      currentUser.uid,
      currentUser.displayName,
      currentUser.photoURL,
    )
  }

  useEffect(() => {
    const unsubscribe = fetchReplyCount(boardId, postId, commentId, setReplyCount)
    return () => unsubscribe()
  }, [boardId, postId, commentId])

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="-mt-2">
      <div className="flex items-center space-x-2">
        <MessageCircle className="size-4 text-muted-foreground" />
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-0 text-sm font-normal text-muted-foreground hover:text-foreground"
          onClick={toggleExpand}
        >
          {isExpanded ? "답글 접기" : `답글 ${replyCount}개`}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="mt-6 space-y-4 border-l-2 border-gray-200 pl-4">
          <ReplyList boardId={boardId} postId={postId} commentId={commentId} />
          <div className="space-y-2">
            <ReplyPrompt />
            <ReplyInput onSubmit={handleSubmit} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Replies

