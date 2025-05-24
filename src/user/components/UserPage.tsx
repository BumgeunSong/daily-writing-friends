import { useParams } from "react-router-dom"
import StatusMessage from "@/shared/components/StatusMessage"
import { UserPageHeader } from "@/user/components/UserPageHeader"
import UserPostsList from "@/user/components/UserPostList"
import UserProfile from "@/user/components/UserProfile"
import { useAuth } from "@/shared/hooks/useAuth"
import { useRegisterTabHandler } from "@/shared/contexts/BottomTabHandlerContext"
import { useCallback } from "react"
import { useUser } from '../hooks/useUser'
import { Link } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar'

interface KnownBuddyProps {
  knownBuddy: {
    uid: string;
    nickname: string | null;
    profilePhotoURL: string | null;
  }
}

const KnownBuddy: React.FC<KnownBuddyProps> = ({ knownBuddy }) => (
  <div className="mt-6 p-4 rounded-xl bg-gradient-to-tr from-orange-100 via-pink-100 to-purple-100 flex items-center gap-3">
    <span className="text-sm font-semibold text-gray-700">비밀 친구</span>
    <Link to={`/user/${knownBuddy.uid}`} className="flex items-center gap-2 group">
      <Avatar className="size-9">
        <AvatarImage src={knownBuddy.profilePhotoURL || ''} alt={knownBuddy.nickname || 'Buddy'} />
        <AvatarFallback>{knownBuddy.nickname?.[0] || 'B'}</AvatarFallback>
      </Avatar>
      <span className="font-medium text-gray-900 group-hover:underline">{knownBuddy.nickname}</span>
    </Link>
  </div>
);

export default function UserPage() {
  const { userId: paramUserId } = useParams()
  const { currentUser } = useAuth()
  const userId = paramUserId || currentUser?.uid
  const { userData } = useUser(userId)

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
          {userData?.knownBuddy && <KnownBuddy knownBuddy={userData.knownBuddy} />}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        <UserPostsList userId={userId} />
      </main>
    </div>
  )
}
