"use client"

import { Edit, Trash2, X } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { deleteCommentToPost, updateCommentToPost } from "@/utils/commentUtils"
import { sanitizeCommentContent } from "@/utils/contentUtils"
import CommentInput from "./CommentInput"
import type { Comment } from "@/types/Comment"
import { fetchUserProfileOnce } from "@/utils/userUtils"
import Replies from "../reply/Replies"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ReactionList from "@/components/pages/reaction/ReactionList"

interface CommentRowProps {
  boardId: string
  postId: string
  comment: Comment
  isAuthor: boolean
}

const CommentRow: React.FC<CommentRowProps> = ({ boardId, postId, comment, isAuthor }) => {
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile", comment.userId],
    queryFn: () => fetchUserProfileOnce(comment.userId),
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시 유지
  })

  const handleEditToggle = async () => {
    setIsEditing((prev) => !prev)
  }

  const handleDelete = async () => {
    if (window.confirm("댓글을 삭제하시겠습니까?")) {
      await deleteCommentToPost(boardId, postId, comment.id)
      // 댓글 삭제 후 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ["comments", boardId, postId] })
    }
  }

  const handleEditSubmit = async (content: string) => {
    await updateCommentToPost(boardId, postId, comment.id, content)
    setIsEditing(false)
    // 댓글 수정 후 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ["comments", boardId, postId] })
  }

  const EditIcon = isEditing ? X : Edit
  const sanitizedContent = sanitizeCommentContent(comment.content)

  return (
    <div className="flex flex-col space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="size-6">
            <AvatarImage
              src={userProfile?.profilePhotoURL || undefined}
              alt={userProfile?.nickname || "User"}
              className="object-cover"
            />
            <AvatarFallback className="text-sm">{userProfile?.nickname?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <p className="text-base font-semibold leading-none">{userProfile?.nickname || "??"}</p>
          <span className="text-sm text-muted-foreground">{comment.createdAt?.toDate().toLocaleString()}</span>
        </div>
        {isAuthor && (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditToggle}
              className="h-6 px-2 text-muted-foreground hover:text-primary hover:bg-transparent"
            >
              <EditIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-6 px-2 text-muted-foreground hover:text-destructive hover:bg-transparent"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="text-base">
        {isEditing ? (
          <CommentInput onSubmit={handleEditSubmit} initialValue={comment.content} />
        ) : (
          <div className="prose whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
        )}
      </div>
      <ReactionList entity={{ type: "comment", boardId, postId, commentId: comment.id }} />
      <div className="flex flex-col space-y-1">
        <Replies boardId={boardId} postId={postId} commentId={comment.id} />
      </div>
    </div>
  )
}

export default CommentRow

