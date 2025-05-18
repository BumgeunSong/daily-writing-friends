import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Skeleton } from "@/shared/ui/skeleton"
import { useUser } from "@/user/hooks/useUser"
import { useAuth } from "@/shared/hooks/useAuth"
import { useNavigate } from "react-router-dom"
import { Edit } from "lucide-react"
import { Button } from "@/shared/ui/button"

interface UserProfileProps {
  uid: string
}

export default function UserProfile({ uid }: UserProfileProps) {
  const { userData, isLoading } = useUser(uid)

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-sm text-muted-foreground">User not found</p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-4 w-full">
      <Avatar className="size-20 md:size-24 shrink-0 mt-1">
        {userData.profilePhotoURL ? (
          <AvatarImage src={userData.profilePhotoURL || "/placeholder.svg"} alt={`${userData.nickname}'s profile`} />
        ) : (
          <AvatarFallback>{userData.nickname?.charAt(0).toUpperCase()}</AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{userData.nickname}</h2>
          <UserProfileSettingsButton uid={uid} />
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground mt-1">
          {userData.bio ||
            "아직 자기소개가 없어요 😅"}
        </p>
      </div>
    </div>
  )
}

// 설정 버튼 분리 컴포넌트
function UserProfileSettingsButton({ uid }: { uid: string }) {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  if (currentUser?.uid !== uid) return null
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="설정"
      className="ml-2 shrink-0"
      onClick={() => navigate(`/account/edit/${uid}`)}
    >
      <Edit className="size-5 text-muted-foreground" />
    </Button>
  )
}