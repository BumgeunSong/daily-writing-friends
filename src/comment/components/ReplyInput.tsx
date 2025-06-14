import { useMutation } from "@tanstack/react-query"
import { Send, Loader2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/shared/hooks/use-toast"
import { useAuth } from '@/shared/hooks/useAuth'
import { Button } from "@/shared/ui/button"
import { Textarea } from "@/shared/ui/textarea"
import type React from "react"

interface ReplyInputProps {
  placeholder?: string
  initialValue?: string
  onSubmit: (content: string) => Promise<void>
}

const ReplyInput: React.FC<ReplyInputProps> = ({ placeholder, initialValue = "", onSubmit }) => {
  const [newReply, setNewReply] = useState(initialValue)
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: (content: string) => onSubmit(content),
    onSuccess: () => {
      setNewReply("")
    },
    onError: (error) => {
      console.error("답글 추가 오류:", error)
      toast({
        title: "오류 발생",
        description: "답글을 등록하는 중 문제가 발생했습니다. 다시 시도해 주세요.",
        variant: "destructive",
      })
    }
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
      <Button type="submit" variant="default" size="icon" disabled={mutation.isLoading}>
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