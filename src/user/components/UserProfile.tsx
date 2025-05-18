import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Skeleton } from "@/shared/ui/skeleton"
import { useUser } from "@/user/hooks/useUser"

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
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {userData.profilePhotoURL ? (
          <AvatarImage src={userData.profilePhotoURL} alt={`${userData.nickname}'s profile`} />
        ) : (
          <AvatarFallback>{userData.nickname?.charAt(0).toUpperCase()}</AvatarFallback>
        )}
      </Avatar>
      <div>
        <h2 className="text-lg font-medium">{userData.nickname}</h2>
        <p className="line-clamp-2 text-sm text-muted-foreground">{userData.bio || '아직 자기소개가 없어요.'}</p>
      </div>
    </div>
  )
}
