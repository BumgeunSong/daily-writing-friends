import { useParams } from "react-router-dom"
import StatusMessage from "@/shared/components/StatusMessage"
import { UserPageHeader } from "@/user/components/UserPageHeader"
import UserPostsList from "@/user/components/UserPostList"
import UserProfile from "@/user/components/UserProfile"
import { useAuth } from "@/shared/hooks/useAuth"
import { useRegisterTabHandler } from "@/shared/contexts/BottomTabHandlerContext"
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext"
import { useCallback } from "react"
import { UserKnownBuddy } from './UserKnownBuddy'

export default function UserPage() {
  const { userId: paramUserId } = useParams()
  const { currentUser } = useAuth()
  const { value: secretBuddyEnabled } = useRemoteConfig('secret_buddy_enabled')
  const userId = paramUserId || currentUser?.uid

  useRegisterTabHandler('User', useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), [userId]));

  if (!userId) {
    return <StatusMessage errorMessage="유저 정보를 찾을 수 없습니다." />
  }

  const isMyPage = currentUser?.uid === userId;

  return (
    <div className="min-h-screen bg-background">
      <UserPageHeader isMyPage={isMyPage} />
      
      <main className="container mx-auto px-3 md:px-4 py-2 pb-16">
        {/* User profile section */}
        <div className="mb-2">
          <UserProfile uid={userId} />
          {/* Known Buddy 정보 표시 */}
          {isMyPage && secretBuddyEnabled && <UserKnownBuddy />}
        </div>

        {/* Posts content */}
        <UserPostsList userId={userId} />
      </main>
    </div>
  )
}
