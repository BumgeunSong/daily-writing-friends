import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@shared/ui/avatar"
import { Skeleton } from "@shared/ui/skeleton"

interface UserProfileProps {
  userId: string
}

interface UserData {
  nickname: string
  bio: string
  profileImage: string | null
}

export default function UserProfile({ userId }: UserProfileProps) {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  // Simulate fetching user data
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true)

      // Simulate API call
      setTimeout(() => {
        setUserData({
          nickname: "user_nickname",
          bio: "Hi, This is bio",
          profileImage: null,
        })
        setLoading(false)
      }, 1000)
    }

    if (userId) {
      fetchUserData()
    }
  }, [userId])

  if (loading) {
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
        {userData.profileImage ? (
          <AvatarImage src={userData.profileImage || "/placeholder.svg"} alt={`${userData.nickname}'s profile`} />
        ) : (
          <AvatarFallback>{userData.nickname.charAt(0).toUpperCase()}</AvatarFallback>
        )}
      </Avatar>
      <div>
        <h2 className="text-lg font-medium">{userData.nickname}</h2>
        <p className="text-sm text-muted-foreground line-clamp-2">{userData.bio}</p>
      </div>
    </div>
  )
}
