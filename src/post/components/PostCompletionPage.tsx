import { useNavigate, useParams } from "react-router-dom"
import { PostCompletionContent } from "./PostCompletionContent"
import { useCompletionMessage } from "@/post/hooks/useCompletionMessage"

export default function PostCompletionPage() {
  const navigate = useNavigate()
  const { boardId } = useParams()
  const { titleMessage, contentMessage, highlight, iconType, isLoading } = useCompletionMessage()

  const handleConfirm = () => {
    navigate(`/board/${boardId}`) // Navigate back to board page
  }

  return (
    <PostCompletionContent
      titleMessage={titleMessage}
      contentMessage={contentMessage}
      highlight={highlight}
      iconType={iconType}
      isLoading={isLoading}
      onConfirm={handleConfirm}
    />
  )
}
