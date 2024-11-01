import React, { useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from 'lucide-react'
import { addReplyToComment } from '@/utils/commentUtils'

interface ReplyInputProps {
  postId: string
  commentId: string
  placeholder?: string
}

const CommentInput: React.FC<ReplyInputProps> = ({ postId, commentId, placeholder }) => {
  const [newReply, setNewReply] = useState('')
  const { currentUser } = useAuth()

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !postId || !newReply.trim()) return

    try {
      await addReplyToComment(postId, commentId, newReply, currentUser.uid, currentUser.displayName, currentUser.photoURL)
      setNewReply('')
    } catch (error) {
      console.error('답글 추가 오류:', error)
    }
  }

  return (
    <form onSubmit={handleAddComment} className="w-full flex items-center space-x-2">
      <Input
        type="text"
        placeholder={placeholder}
        value={newReply}
        onChange={(e) => setNewReply(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" size="icon">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}

export default CommentInput