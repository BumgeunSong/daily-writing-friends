import { Edit, Trash2, X } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { deleteCommentToPost, updateCommentToPost } from "@/utils/commentUtils"
import { sanitizeCommentContent } from "@/utils/contentUtils"
import CommentInput from "./CommentInput"
import type { Comment } from "@/types/Comment"
import { fetchUserUserProfile } from "@/utils/userUtils"
import Replies from "../reply/Replies"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserProfile } from "@/types/UserProfile"

interface CommentRowProps {
  boardId: string
  postId: string
  comment: Comment
  isAuthor: boolean
}

const CommentRow: React.FC<CommentRowProps> = ({ boardId, postId, comment, isAuthor }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const handleEditToggle = async () => {
    setIsEditing((prev) => !prev)
  }

  const handleDelete = async () => {
    if (window.confirm("댓글을 삭제하시겠습니까?")) {
      await deleteCommentToPost(boardId, postId, comment.id)
    }
  }

  const handleEditSubmit = async (content: string) => {
    await updateCommentToPost(boardId, postId, comment.id, content)
    setIsEditing(false)
  }

  useEffect(() => {
    fetchUserUserProfile(comment.userId).then(setUserProfile)
  }, [comment.userId])

  const EditIcon = isEditing ? X : Edit
  const sanitizedContent = sanitizeCommentContent(comment.content)

  return (
    <div className="flex flex-col space-y-4 pb-4">
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
      <Replies boardId={boardId} postId={postId} commentId={comment.id} />
    </div>
  )
}

export default CommentRow
