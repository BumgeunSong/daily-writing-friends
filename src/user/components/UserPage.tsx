import { useParams } from "react-router-dom"
import StatusMessage from "@/shared/components/StatusMessage"
import { UserPageHeader } from "@/user/components/UserPageHeader"
import UserPostsList from "@/user/components/UserPostList"
import UserProfile from "@/user/components/UserProfile"
import { useAuth } from "@/shared/hooks/useAuth"
import { useRegisterTabHandler } from "@/shared/contexts/BottomTabHandlerContext"
import { useCallback } from "react"
import { UserKnownBuddy } from './UserKnownBuddy'

export default function UserPage() {
  const { userId: paramUserId } = useParams()
  const { currentUser } = useAuth()
  const userId = paramUserId || currentUser?.uid

  useRegisterTabHandler('User', useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), [userId]));

  if (!userId) {
    return <StatusMessage errorMessage="유저 정보를 찾을 수 없습니다." />
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-full flex-col bg-background pb-16">
      {/* Header section with settings button */}
      <header className="sticky top-0 z-10 border-b bg-background">
        <UserPageHeader userId={userId} />

        {/* User profile section */}
        <div className="p-4">
          <UserProfile uid={userId} />

          {/* Known Buddy 정보 표시 */}
          <UserKnownBuddy />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        <UserPostsList userId={userId} />
      </main>
    </div>
  )
}
