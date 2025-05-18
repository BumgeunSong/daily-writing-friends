import { useQueryClient } from "@tanstack/react-query"
import { Edit, Trash2, X } from "lucide-react"
import { useState } from "react"
import ReactionList from "@/comment/components/ReactionList"
import ReplyInput from "@/comment/components/ReplyInput"
import { deleteReplyToComment, updateReplyToComment } from "@/comment/utils/commentUtils"
import { sanitizeCommentContent } from "@/post/utils/contentUtils"
import { useUserProfile } from "@/user/hooks/useUserProfile"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"
import type { Reply } from "@/comment/model/Reply"
import type React from "react"

interface ReplyRowProps {
  reply: Reply
  boardId: string
  commentId: string
  postId: string
  isAuthor: boolean
}

const ReplyRow: React.FC<ReplyRowProps> = ({ boardId, reply, commentId, postId, isAuthor }) => {
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  const { data: userProfile } = useUserProfile(reply.userId);

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev)
  }

  const handleDelete = async () => {
    if (window.confirm("답글을 삭제하시겠습니까?")) {
      await deleteReplyToComment(boardId, postId, commentId, reply.id)
      // 답글 삭제 후 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ["replies", boardId, postId, commentId] })
      queryClient.invalidateQueries({ queryKey: ["replyCount", boardId, postId, commentId] })
    }
  }

  const handleEditSubmit = async (content: string) => {
    await updateReplyToComment(boardId, postId, commentId, reply.id, content)
    setIsEditing(false)
    // 답글 수정 후 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ["replies", boardId, postId, commentId] })
  }

  const EditIcon = isEditing ? X : Edit
  const sanitizedContent = sanitizeCommentContent(reply.content)

  return (
    <div className="group flex flex-col space-y-3 pb-4">
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
          <span className="text-sm text-muted-foreground">{reply.createdAt?.toDate().toLocaleString()}</span>
        </div>
        {isAuthor && (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditToggle}
              className="h-6 px-2 text-muted-foreground hover:bg-transparent hover:text-primary"
            >
              <EditIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-6 px-2 text-muted-foreground hover:bg-transparent hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="text-base">
        {isEditing ? (
          <ReplyInput onSubmit={handleEditSubmit} initialValue={reply.content} />
        ) : (
          <div className="prose whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
        )}
      </div>
      
        <ReactionList entity={{ type: "reply", boardId, postId, commentId, replyId: reply.id }} />
      
    </div>
  )
}

export default ReplyRow
