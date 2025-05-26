import { useQueryClient, useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { Suspense } from "react"
import CommentInput from "@/comment/components/CommentInput"
import CommentList from "@/comment/components/CommentList"
import CommentPrompt from "@/comment/components/CommentPrompt"
import { fetchCommentsOnce } from "@/comment/utils/commentUtils"
import { addCommentToPost } from "@/comment/utils/commentUtils"
import { useAuth } from "@/shared/hooks/useAuth"
import { sendAnalyticsEvent, AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import type React from "react"
import { getBlockedByUsers } from "@/user/api/user"
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

// 이 컴포넌트는 Suspense와 함께 사용하기 위한 것입니다
const CommentLoadingIndicator: React.FC<{
  boardId: string;
  postId: string;
}> = ({ boardId, postId }) => {
  // 이 쿼리는 Suspense를 트리거하기 위해 사용됩니다
  const { currentUser } = useAuth()

  useQuery({
    queryKey: ['comments', boardId, postId],
    queryFn: async () => {
      const blockedByUsers = await getBlockedByUsers(currentUser?.uid);
      return fetchCommentsOnce(boardId, postId, blockedByUsers);
    },
    suspense: true,
  });
  
  // 데이터가 로드되면 아무것도 렌더링하지 않습니다
  return null;
};

const Comments: React.FC<CommentsProps> = ({ boardId, postId, postAuthorId, postAuthorNickname }) => {
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()

  const handleSubmit = async (content: string) => {
    if (!postId || !currentUser) {
      return
    }

    await addCommentToPost(boardId, postId, content, currentUser.uid, currentUser.displayName, currentUser.photoURL)
    sendAnalyticsEvent(AnalyticsEvent.CREATE_COMMENT, {
      boardId,
      postId,
      userId: currentUser.uid,
      userName: currentUser.displayName
    });
    
    // 댓글 추가 후 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ['comments', boardId, postId] })
  }

  return (
    <section className="mt-12 space-y-8">
      <div className="flex items-center">
        <h2 className="text-2xl font-semibold">댓글</h2>
        <Suspense fallback={<LoadingIndicator />}>
          <CommentLoadingIndicator boardId={boardId} postId={postId} />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <CommentList boardId={boardId} postId={postId} />
      </Suspense>
      <div className="mt-6 space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">
        <CommentPrompt postAuthorId={postAuthorId} postAuthorNickname={postAuthorNickname} />
        <CommentInput onSubmit={handleSubmit} />
      </div>
    </section>
  )
}

export default Comments

