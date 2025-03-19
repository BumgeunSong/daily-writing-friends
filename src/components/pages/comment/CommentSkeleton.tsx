import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const CommentSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="size-6">
            <AvatarFallback className="bg-muted"></AvatarFallback>
          </Avatar>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="text-base">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="pl-6 border-l border-muted mt-4">
        <Skeleton className="h-10 w-full mb-2" />
      </div>
    </div>
  )
}

export default CommentSkeleton 