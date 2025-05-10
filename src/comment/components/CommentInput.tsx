import { useMutation } from "@tanstack/react-query"
import { Send, Loader2 } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/shared/hooks/useAuth"
import { Button } from "@/shared/ui/button"
import { Textarea } from "@/shared/ui/textarea"
import type React from "react"

interface CommentInputProps {
  initialValue?: string
  placeholder?: string
  onSubmit: (content: string) => Promise<void>
}

const CommentInput: React.FC<CommentInputProps> = ({ 
  initialValue = "", 
  placeholder, 
  onSubmit 
}) => {
  const [newComment, setNewComment] = useState(initialValue)
  const { currentUser } = useAuth()
  
  const mutation = useMutation({
    mutationFn: (content: string) => onSubmit(content),
    onSuccess: () => setNewComment("")
  })

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !newComment.trim() || mutation.isLoading) return
    
    mutation.mutate(newComment)
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
      <Button type="submit" size="icon" disabled={mutation.isLoading}>
        {mutation.isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
      </Button>
    </form>
  )
}

export default CommentInput

