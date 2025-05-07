import { useNavigate } from "react-router-dom"
import { PostCompletionContent } from "./PostCompletionContent"
import { useCompletionMessage } from "@/hooks/useCompletionMessage"

export default function PostCompletionPage() {
  const navigate = useNavigate()
  const { titleMessage, contentMessage, isLoading } = useCompletionMessage()

  // highlightValue, highlightUnit, highlightColor, iconType 결정
  // streak 메시지면 streak, 아니면 boardPostCount 사용
  // useCompletionMessage에서 streak, boardPostCount를 반환하도록 확장해도 됨
  // 여기서는 contentMessage에서 숫자 추출(간단하게)
  const highlightValue = Number(contentMessage.replace(/[^0-9]/g, "")) || 0
  const highlightUnit = contentMessage.includes("일") ? "일" : "개"
  const highlightColor = contentMessage.includes("일") ? "yellow" : "purple"
  const iconType = contentMessage.includes("일") ? "trophy" : "sparkles"

  const handleConfirm = () => {
    navigate("/") // Navigate back to board page
  }

  return (
    <PostCompletionContent
      titleMessage={titleMessage}
      contentMessage={contentMessage}
      highlightValue={highlightValue}
      highlightUnit={highlightUnit}
      highlightColor={highlightColor}
      iconType={iconType}
      isLoading={isLoading}
      onConfirm={handleConfirm}
    />
  )
}
