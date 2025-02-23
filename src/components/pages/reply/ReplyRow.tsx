import { Edit, Trash2, X } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import type { Reply } from "@/types/Reply"
import { deleteReplyToComment, updateReplyToComment } from "@/utils/commentUtils"
import { sanitizeCommentContent } from "@/utils/contentUtils"
import { fetchUserUserProfile } from "@/utils/userUtils"
import ReplyInput from "./ReplyInput"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserProfile } from "@/types/UserProfile"

interface ReplyRowProps {
  reply: Reply
  boardId: string
  commentId: string
  postId: string
  isAuthor: boolean
}

const ReplyRow: React.FC<ReplyRowProps> = ({ boardId, reply, commentId, postId, isAuthor }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const handleEditToggle = async () => {
    setIsEditing((prev) => !prev)
  }

  const handleDelete = async () => {
    if (window.confirm("답글을 삭제하시겠습니까?")) {
      await deleteReplyToComment(boardId, postId, commentId, reply.id)
    }
  }

  const handleEditSubmit = async (content: string) => {
    await updateReplyToComment(boardId, postId, commentId, reply.id, content)
    setIsEditing(false)
  }

  const EditIcon = isEditing ? X : Edit

  useEffect(() => {
    fetchUserUserProfile(reply.userId).then(setUserProfile)
  }, [reply.userId])

  const sanitizedContent = sanitizeCommentContent(reply.content)

  return (
    <div className="flex flex-col space-y-4 pb-4 group">
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
          <ReplyInput onSubmit={handleEditSubmit} initialValue={reply.content} />
        ) : (
          <div className="prose whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
        )}
      </div>
    </div>
  )
}

export default ReplyRow
