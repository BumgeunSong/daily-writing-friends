import type React from "react"
import { Avatar, AvatarFallback } from "@/shared/ui/avatar"
import { Skeleton } from "@/shared/ui/skeleton"

const ReplySkeleton: React.FC = () => {
  return (
    <div className="flex flex-col space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="size-6">
            <AvatarFallback className="bg-muted" />
          </Avatar>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="text-base">
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

export default ReplySkeleton 