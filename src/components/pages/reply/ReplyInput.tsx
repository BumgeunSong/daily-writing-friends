import { Send, Loader2 } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/AuthContext"
import { useMutation } from "@tanstack/react-query"

interface ReplyInputProps {
  placeholder?: string
  initialValue?: string
  onSubmit: (content: string) => Promise<void>
}

const ReplyInput: React.FC<ReplyInputProps> = ({ placeholder, initialValue = "", onSubmit }) => {
  const [newReply, setNewReply] = useState(initialValue)
  const { currentUser } = useAuth()

  const mutation = useMutation({
    mutationFn: (content: string) => onSubmit(content),
    onSuccess: () => setNewReply("")
  })

  const handleAddReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !newReply.trim() || mutation.isLoading) return
    
    mutation.mutate(newReply)
  }

  return (
    <form onSubmit={handleAddReply} className="flex w-full items-center space-x-4">
      <Textarea
        placeholder={placeholder || "댓글을 달아줬다면 답을 해주는 게 인지상정!"}
        value={newReply}
        onChange={(e) => setNewReply(e.target.value)}
        className="flex-1 resize-none text-base"
        rows={3}
        disabled={mutation.isLoading}
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

export default ReplyInput

