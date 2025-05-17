import UserProfile from "@/user/components/UserProfile"
import UserPostsList from "@/user/components/UserPostList"
import { UserPageHeader } from "@/user/components/UserPageHeader"
import { useNavigate, useParams } from "react-router-dom"
import StatusMessage from "@/shared/components/StatusMessage"

export default function UserPage() {
  const navigate = useNavigate()
  const { userId } = useParams()

  const handleGoToSettings = () => {
    navigate("/account/edit")
  }

  if (!userId) {
    return (
      <StatusMessage error errorMessage="유저 정보를 찾을 수 없습니다." />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 max-w-2xl mx-auto">
      {/* Header section with settings button */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <UserPageHeader onClick={handleGoToSettings} />

        {/* User profile section */}
        <div className="p-4">
          <UserProfile userId={userId} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        <UserPostsList userId={userId} />
      </main>
    </div>
  )
}
