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

const ReplyInput: React.FC<ReplyInputProps> = ({ postId, commentId, placeholder }) => {
  const [newReply, setNewReply] = useState('')
  const { currentUser } = useAuth()

  const handleAddReply = async (e: React.FormEvent) => {
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
    <form onSubmit={handleAddReply} className="w-full flex items-center space-x-4">
      <Input
        type="text"
        placeholder={placeholder || "답글을 입력하세요..."}
        value={newReply}
        onChange={(e) => setNewReply(e.target.value)}
        className="flex-1 text-base"
      />
      <Button type="submit" size="icon">
        <Send className="h-4 w-4 mr-2" />
      </Button>
    </form>
  )
}

export default ReplyInput