import type React from "react"
import { useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { addReplyToComment } from "@/utils/commentUtils"
import ReplyInput from "./ReplyInput"
import ReplyList from "./ReplyList"
import { Loader2, MessageCircle } from "lucide-react"
import ReplyPrompt from "./ReplyPrompt"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchRepliesOnce, fetchReplyCountOnce } from '@/utils/replyUtils'

interface RepliesProps {
  boardId: string
  postId: string
  commentId: string
}

// 로딩 인디케이터 컴포넌트
const LoadingIndicator: React.FC = () => (
  <Loader2 className="size-4 text-muted-foreground animate-spin ml-1" />
);

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
    if (!isExpanded) {
      // 펼칠 때 데이터 미리 가져오기
      queryClient.prefetchQuery({
        queryKey: ['replies', boardId, postId, commentId],
        queryFn: () => fetchRepliesOnce(boardId, postId, commentId),
      })
    }
    
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="-mt-2">
      <div className="flex items-center space-x-2">
        <MessageCircle className="size-4 text-muted-foreground" />
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-sm font-normal text-muted-foreground hover:text-foreground"
            onClick={toggleExpand}
          >
            {isExpanded ? "답글 접기" : `답글 ${replyCount}개`}
          </Button>
          
          {/* 답글이 펼쳐져 있을 때만 로딩 인디케이터 표시 */}
          {isExpanded && (
            <Suspense fallback={<LoadingIndicator />}>
              <ReplyLoadingIndicator 
                boardId={boardId} 
                postId={postId} 
                commentId={commentId} 
              />
            </Suspense>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-6 space-y-4 border-l-2 border-gray-200 pl-4">
          <Suspense fallback={null}>
            <ReplyList boardId={boardId} postId={postId} commentId={commentId} />
          </Suspense>
          <div className="space-y-2">
            <ReplyPrompt />
            <ReplyInput onSubmit={handleSubmit} />
          </div>
        </div>
      )}
    </div>
  )
}

// 이 컴포넌트는 Suspense와 함께 사용하기 위한 것입니다
const ReplyLoadingIndicator: React.FC<{
  boardId: string;
  postId: string;
  commentId: string;
}> = ({ boardId, postId, commentId }) => {
  // 이 쿼리는 Suspense를 트리거하기 위해 사용됩니다
  useQuery({
    queryKey: ['replies', boardId, postId, commentId],
    queryFn: () => fetchRepliesOnce(boardId, postId, commentId),
    suspense: true,
  });
  
  // 데이터가 로드되면 아무것도 렌더링하지 않습니다
  return null;
};

export default Replies

