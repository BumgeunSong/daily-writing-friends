import { Loader2 } from "lucide-react"
import { Suspense } from "react"
import CommentInput from "@/comment/components/CommentInput"
import CommentList from "@/comment/components/CommentList"
import CommentPrompt from "@/comment/components/CommentPrompt"
import { useCreateComment } from "@/comment/hooks/useCreateComment"
import { useAuth } from "@/shared/hooks/useAuth"
import { sendAnalyticsEvent, AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import type React from "react"

interface CommentsProps {
  boardId: string
  postId: string
  postAuthorId: string
  postAuthorNickname: string | null
}

// 로딩 인디케이터 컴포넌트
const LoadingIndicator: React.FC = () => (
  <Loader2 className="ml-2 size-4 animate-spin text-muted-foreground" />
);

const Comments: React.FC<CommentsProps> = ({ boardId, postId, postAuthorId, postAuthorNickname }) => {
  const { currentUser } = useAuth()
  const addComment = useCreateComment(boardId, postId)

  const handleSubmit = async (content: string) => {
    try {
      await addComment.mutateAsync(content)
      if (currentUser) {
        sendAnalyticsEvent(AnalyticsEvent.CREATE_COMMENT, {
          boardId,
          postId,
          userId: currentUser.uid,
          userName: currentUser.displayName
        });
      }
    } catch (e) {
      // 에러 핸들링 필요시 추가
    }
  }

  return (
    <section className="mt-12 space-y-8">
      <div className="flex items-center">
        <h2 className="text-2xl font-semibold">댓글</h2>
        <Suspense fallback={<LoadingIndicator />}>
          {/* Suspense fallback만 담당, 데이터 fetch는 CommentList 내부에서 */}
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <CommentList boardId={boardId} postId={postId} currentUserId={currentUser?.uid} />
      </Suspense>
      <div className="mt-6 space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">
        <CommentPrompt postAuthorId={postAuthorId} postAuthorNickname={postAuthorNickname} />
        <CommentInput onSubmit={handleSubmit} />
      </div>
    </section>
  )
}

export default Comments

