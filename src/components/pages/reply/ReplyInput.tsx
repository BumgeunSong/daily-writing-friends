"use client"

import { Send } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/AuthContext"

interface ReplyInputProps {
  placeholder?: string
  initialValue?: string
  onSubmit: (content: string) => void
}

const ReplyInput: React.FC<ReplyInputProps> = ({ placeholder, initialValue = "", onSubmit }) => {
  const [newReply, setNewReply] = useState(initialValue)
  const { currentUser } = useAuth()

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !newReply.trim()) return

    try {
      await onSubmit(newReply)
      setNewReply("")
    } catch (error) {
      console.error("답글 추가 오류:", error)
    }
  }

  return (
    <form onSubmit={handleAddReply} className="flex w-full items-center space-x-4">
      <Textarea
        placeholder={placeholder || "댓글을 달아줬다면 답을 해주는 게 인지상정!"}
        value={newReply}
        onChange={(e) => setNewReply(e.target.value)}
        className="flex-1 resize-none text-base"
        rows={3}
      />
      <Button type="submit" size="icon">
        <Send className="size-4" />
      </Button>
    </form>
  )
}

export default ReplyInput

