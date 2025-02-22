import { Send } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/AuthContext"

interface CommentInputProps {
  initialValue?: string
  placeholder?: string
  onSubmit: (content: string) => Promise<void>
}

const CommentInput: React.FC<CommentInputProps> = ({ initialValue = "", placeholder, onSubmit }) => {
  const [newComment, setNewComment] = useState(initialValue)
  const { currentUser } = useAuth()

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !newComment.trim()) return

    try {
      await onSubmit(newComment)
      setNewComment("")
    } catch (error) {
      console.error("댓글 추가 오류:", error)
    }
  }

  return (
    <form onSubmit={handleAddComment} className="flex w-full items-center space-x-4">
      <Textarea
        placeholder={placeholder || "재밌게 읽었다면 댓글로 글값을 남겨볼까요?"}
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        rows={3}
        className="flex-1 resize-none text-base"
      />
      <Button type="submit" size="icon">
        <Send className="size-4" />
      </Button>
    </form>
  )
}

export default CommentInput

