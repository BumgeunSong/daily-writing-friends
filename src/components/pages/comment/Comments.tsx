import type React from "react"
import { useAuth } from "@/contexts/AuthContext"
import { addCommentToPost } from "@/utils/commentUtils"
import CommentInput from "./CommentInput"
import CommentList from "./CommentList"
import CommentPrompt from "./CommentPrompt"
import { useQueryClient } from "@tanstack/react-query"

interface CommentsProps {
  boardId: string
  postId: string
  postAuthorId: string
  postAuthorNickname: string | null
}

const Comments: React.FC<CommentsProps> = ({ boardId, postId, postAuthorId, postAuthorNickname }) => {
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()

  const handleSubmit = async (content: string) => {
    if (!postId || !currentUser) {
      return
    }

    await addCommentToPost(boardId, postId, content, currentUser.uid, currentUser.displayName, currentUser.photoURL)
    
    // 댓글 추가 후 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ['comments', boardId, postId] })
  }

  return (
    <section className="mt-12 space-y-8">
      <h2 className="text-2xl font-semibold">댓글</h2>
      <CommentList boardId={boardId} postId={postId} />
      <div className="mt-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
        <CommentPrompt postAuthorId={postAuthorId} postAuthorNickname={postAuthorNickname} />
        <CommentInput onSubmit={handleSubmit} />
      </div>
    </section>
  )
}

export default Comments

