import { Loader2, MessageCircle } from "lucide-react"
import { useState, Suspense } from "react"
import { useAuth } from '@/shared/hooks/useAuth'
import { Button } from "@/shared/ui/button"
import { AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { sendAnalyticsEvent } from "@/shared/utils/analyticsUtils"
import ReplyInput from "./ReplyInput"
import ReplyList from "./ReplyList"
import type React from "react"
import { useReplyCount } from '@/comment/hooks/useReplyCount'
import { useCreateReply } from '@/comment/hooks/useCreateReply'

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
  const { replyCount } = useReplyCount(boardId, postId, commentId)
  const createReply = useCreateReply(boardId, postId, commentId)

  const handleSubmit = async (content: string) => {
    try {
      await createReply.mutateAsync(content)
      if (currentUser) {
        sendAnalyticsEvent(AnalyticsEvent.CREATE_REPLY, {
          boardId,
          postId,
          commentId,
          userId: currentUser.uid,
          userName: currentUser.displayName,
        })
      }
    } catch (e) {
      // 에러 핸들링 필요시 추가
    }
  }

  const toggleExpand = () => {
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
            className="h-auto px-0 text-sm font-normal text-muted-foreground reading-focus transition-colors duration-200 hover:bg-selection/60 hover:text-foreground"
            onClick={toggleExpand}
          >
            {isExpanded ? "답글 접기" : `답글 ${replyCount}개`}
          </Button>

          {/* 답글이 펼쳐져 있을 때만 로딩 인디케이터 표시 */}
          {isExpanded && (
            <Suspense fallback={<LoadingIndicator />}>
              {/* Suspense fallback만 담당, 실제 데이터 fetch는 ReplyList 내부에서 */}
            </Suspense>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-6 border-l-2 border-border pl-4">
          <Suspense fallback={null}>
            <ReplyList boardId={boardId} postId={postId} commentId={commentId} currentUserId={currentUser?.uid} />
          </Suspense>
          <div className="space-y-2">
            <ReplyInput onSubmit={handleSubmit} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Replies

