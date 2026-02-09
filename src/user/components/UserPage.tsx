import { useCallback } from "react"
import { useParams } from "react-router-dom"
import StatusMessage from "@/shared/components/StatusMessage"
import { useRegisterTabHandler } from "@/shared/contexts/BottomTabHandlerContext"
import { useAuth } from "@/shared/hooks/useAuth"
import { UserPageHeader } from "@/user/components/UserPageHeader"
import UserPostsList from "@/user/components/UserPostList"
import UserProfile from "@/user/components/UserProfile"

export default function UserPage() {
  const { userId: paramUserId } = useParams()
  const { currentUser } = useAuth()
  const userId = paramUserId || currentUser?.uid

  useRegisterTabHandler('User', useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []));

  if (!userId) {
    return <StatusMessage errorMessage="유저 정보를 찾을 수 없습니다." />
  }

  const isMyPage = currentUser?.uid === userId;

  return (
    <div className="min-h-screen bg-background">
      <UserPageHeader isMyPage={isMyPage} />
      
      <main className="container mx-auto px-3 py-2 pb-16 md:px-4">
        {/* User profile section */}
        <div className="mb-2">
          <UserProfile uid={userId} />
        </div>

        {/* Posts content */}
        <UserPostsList userId={userId} />
      </main>
    </div>
  )
}
