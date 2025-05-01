import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, MessageCircle } from "lucide-react"
import { useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { AnalyticsEvent } from "@/utils/analyticsUtils"
import { sendAnalyticsEvent } from "@/utils/analyticsUtils"
import { addReplyToComment } from "@/utils/commentUtils"
import { fetchRepliesOnce, fetchReplyCountOnce } from "@/utils/replyUtils"
import ReplyInput from "./ReplyInput"
import ReplyList from "./ReplyList"
import type React from "react"

interface RepliesProps {
  boardId: string
  postId: string
  commentId: string
}

// 로딩 인디케이터 컴포넌트
const LoadingIndicator: React.FC = () => <Loader2 className="ml-1 size-4 animate-spin text-muted-foreground" />

const Replies: React.FC<RepliesProps> = ({ boardId, postId, commentId }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()

  // 답글 개수 가져오기
  const { data: replyCount = 0 } = useQuery({
    queryKey: ["replyCount", boardId, postId, commentId],
    queryFn: () => fetchReplyCountOnce(boardId, postId, commentId),
    refetchOnWindowFocus: false,
  })

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
    sendAnalyticsEvent(AnalyticsEvent.CREATE_REPLY, {
      boardId,
      postId,
      commentId,
      userId: currentUser.uid,
      userName: currentUser.displayName,
    })
    // 답글 추가 후 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ["replies", boardId, postId, commentId] })
    queryClient.invalidateQueries({ queryKey: ["replyCount", boardId, postId, commentId] })
  }

  const toggleExpand = () => {
    if (!isExpanded) {
      // 펼칠 때 데이터 미리 가져오기
      queryClient.prefetchQuery({
        queryKey: ["replies", boardId, postId, commentId],
        queryFn: () => fetchRepliesOnce(boardId, postId, commentId),
      })
    }

    setIsExpanded(!isExpanded)
  }

  return (
    <div className="mt-1">
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
              <ReplyLoadingIndicator boardId={boardId} postId={postId} commentId={commentId} />
            </Suspense>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-6 border-l-2 border-gray-200 pl-4 dark:border-gray-700">
          <Suspense fallback={null}>
            <ReplyList boardId={boardId} postId={postId} commentId={commentId} />
          </Suspense>
          <div className="space-y-2">
            <ReplyInput onSubmit={handleSubmit} />
          </div>
        </div>
      )}
    </div>
  )
}

// 이 컴포넌트는 Suspense와 함께 사용하기 위한 것입니다
const ReplyLoadingIndicator: React.FC<{
  boardId: string
  postId: string
  commentId: string
}> = ({ boardId, postId, commentId }) => {
  // 이 쿼리는 Suspense를 트리거하기 위해 사용됩니다
  useQuery({
    queryKey: ["replies", boardId, postId, commentId],
    queryFn: () => fetchRepliesOnce(boardId, postId, commentId),
    suspense: true,
  })

  // 데이터가 로드되면 아무것도 렌더링하지 않습니다
  return null
}

export default Replies

