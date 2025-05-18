import { useNavigate, useParams } from "react-router-dom"
import StatusMessage from "@/shared/components/StatusMessage"
import { UserPageHeader } from "@/user/components/UserPageHeader"
import UserPostsList from "@/user/components/UserPostList"
import UserProfile from "@/user/components/UserProfile"

export default function UserPage() {
  const { userId } = useParams()

  if (!userId) {
    return (
      <StatusMessage error errorMessage="유저 정보를 찾을 수 없습니다." />
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-full flex-col bg-background pb-16">
      {/* Header section with settings button */}
      <header className="sticky top-0 z-10 border-b bg-background">
        <UserPageHeader />

        {/* User profile section */}
        <div className="p-4">
          <UserProfile uid={userId} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        <UserPostsList userId={userId} />
      </main>
    </div>
  )
}
