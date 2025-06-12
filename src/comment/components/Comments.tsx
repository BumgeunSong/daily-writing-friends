import { Loader2 } from "lucide-react"
import { Suspense } from "react"
import CommentInput from "@/comment/components/CommentInput"
import CommentList from "@/comment/components/CommentList"
import { useActivity } from "@/comment/hooks/useActivity"
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
  
  // Activity data for dynamic placeholder
  const fromDaysAgo = 7;
  const { data: activity, isLoading } = useActivity(postAuthorId, fromDaysAgo);
  const totalActivityCounts = (activity?.commentings || 0) + (activity?.replyings || 0);
  const authorNickname = postAuthorNickname || "작성자";
  
  // Create dynamic placeholder
  const placeholder = (!isLoading && totalActivityCounts > 0) 
    ? `${authorNickname}님은 최근 ${fromDaysAgo}일간 나에게 ${totalActivityCounts}개의 댓글을 달아주었어요. 나도 댓글을 달아볼까요?`
    : "재밌게 읽었다면 댓글로 글값을 남겨볼까요?";

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
    <section className="space-y-4">
      <div className="flex items-center">
        <Suspense fallback={<LoadingIndicator />}>
          {/* Suspense fallback만 담당, 데이터 fetch는 CommentList 내부에서 */}
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <CommentList boardId={boardId} postId={postId} currentUserId={currentUser?.uid} />
      </Suspense>
      <div className="mt-6 space-y-4 border-t border-border pt-6">
        <CommentInput onSubmit={handleSubmit} placeholder={placeholder} />
      </div>
    </section>
  )
}

export default Comments

