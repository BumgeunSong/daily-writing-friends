
import { useNavigate } from "react-router-dom"
import { PostCompletionContent } from "./PostCompletionContent"

export default function PostCompletionPage() {
  const navigate = useNavigate()

  // Example data - in a real app, these would come from your state management or API
  const consecutiveDays = 5
  const totalPosts = 12
  const showStreakMessage = Math.random() > 0.5 // Randomly choose which message to show

  // Determine which message to show
  const titleMessage = showStreakMessage ? "훌륭합니다!" : "멋져요!"
  const contentMessage = showStreakMessage
    ? `연속 글쓰기 ${consecutiveDays}일을 달성했어요`
    : `벌써 ${totalPosts}개의 글을 썼어요`

  const handleConfirm = () => {
    navigate("/") // Navigate back to board page
  }

  return (
    <PostCompletionContent
      titleMessage={titleMessage}
      contentMessage={contentMessage}
      highlightValue={showStreakMessage ? consecutiveDays : totalPosts}
      highlightUnit={showStreakMessage ? "일" : "개"}
      highlightColor={showStreakMessage ? "yellow" : "purple"}
      iconType={showStreakMessage ? "trophy" : "sparkles"}
      isLoading={false}
      onConfirm={handleConfirm}
    />
  )
}
