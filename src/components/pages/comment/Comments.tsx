import type React from "react"
import { useAuth } from "@/contexts/AuthContext"
import { addCommentToPost } from "@/utils/commentUtils"
import CommentInput from "./CommentInput"
import CommentList from "./CommentList"

interface CommentsProps {
  boardId: string
  postId: string
}

const Comments: React.FC<CommentsProps> = ({ boardId, postId }) => {
  const { currentUser } = useAuth()

  const handleSubmit = async (content: string) => {
    if (!postId || !currentUser) {
      return
    }

    await addCommentToPost(boardId, postId, content, currentUser.uid, currentUser.displayName, currentUser.photoURL)
  }

  return (
    <section className="mt-12 space-y-8">
      <h2 className="text-2xl font-semibold">댓글</h2>
      <CommentList boardId={boardId} postId={postId} />
      <div className="mt-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
        <p className="text-sm text-muted-foreground">글에서 인상 깊었던 부분을 언급해보세요</p>
        <CommentInput onSubmit={handleSubmit} />
      </div>
    </section>
  )
}

export default Comments

