import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { addReplyToComment } from "@/utils/commentUtils"
import ReplyInput from "./ReplyInput"
import ReplyList from "./ReplyList"
import { MessageCircle } from "lucide-react"
import ReplyPrompt from "./ReplyPrompt"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchRepliesOnce, fetchReplyCountOnce } from '@/utils/replyUtils'

interface RepliesProps {
  boardId: string
  postId: string
  commentId: string
}

const Replies: React.FC<RepliesProps> = ({ boardId, postId, commentId }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()
  
  // 답글 개수 가져오기
  const { data: replyCount = 0 } = useQuery({
    queryKey: ['replyCount', boardId, postId, commentId],
    queryFn: () => fetchReplyCountOnce(boardId, postId, commentId),
    refetchOnWindowFocus: false,
  });

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
    
    // 답글 추가 후 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ['replies', boardId, postId, commentId] })
    queryClient.invalidateQueries({ queryKey: ['replyCount', boardId, postId, commentId] })
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
    
    // 펼칠 때 데이터 미리 가져오기
    if (!isExpanded) {
      queryClient.prefetchQuery({
        queryKey: ['replies', boardId, postId, commentId],
        queryFn: () => fetchRepliesOnce(boardId, postId, commentId),
      })
    }
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

