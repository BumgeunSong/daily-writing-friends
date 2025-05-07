import { useNavigate } from "react-router-dom"
import { PostCompletionContent } from "./PostCompletionContent"
import { useCompletionMessage } from "@/hooks/useCompletionMessage"

export default function PostCompletionPage() {
  const navigate = useNavigate()
  const { titleMessage, contentMessage, highlight, iconType, isLoading } = useCompletionMessage()

  const handleConfirm = () => {
    navigate("/") // Navigate back to board page
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
