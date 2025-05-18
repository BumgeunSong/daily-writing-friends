import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Skeleton } from "@/shared/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { fetchUserData } from "@/user/utils/userUtils"

interface UserProfileProps {
  userId: string
}

export default function UserProfile({ userId }: UserProfileProps) {
  const { data: userData, isLoading } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => fetchUserData(userId),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1분 캐싱
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
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
      <Avatar className="h-16 w-16">
        {userData.profilePhotoURL ? (
          <AvatarImage src={userData.profilePhotoURL} alt={`${userData.nickname}'s profile`} />
        ) : (
          <AvatarFallback>{userData.nickname?.charAt(0).toUpperCase()}</AvatarFallback>
        )}
      </Avatar>
      <div>
        <h2 className="text-lg font-medium">{userData.nickname}</h2>
        <p className="text-sm text-muted-foreground line-clamp-2">{userData.bio || '아직 자기소개가 없어요.'}</p>
      </div>
    </div>
  )
}
