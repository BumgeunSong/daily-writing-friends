"use client"

import { forwardRef } from "react"
import { Link } from "react-router-dom"
import { MessageCircle } from "lucide-react"
import { formatDate } from "@shared/utils/dateUtils"
import type { Post } from "@/post/model/Post"
import { Image } from "@shared/ui/image"

interface PostItemProps {
  post: Post
}

const PostItem = forwardRef<HTMLDivElement, PostItemProps>(({ post }, ref) => {
  return (
    <div ref={ref} className="border rounded-md hover:border-primary transition-colors">
      <Link to={`/board/${post.boardId}/post/${post.id}`} className="flex p-4 gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-lg truncate">{post.title}</h3>
          <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{post.content}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{formatDate(post.createdAt)}</span>
            <div className="flex items-center">
              <MessageCircle className="h-3 w-3 mr-1" />
              <span>{post.countOfComments + post.countOfReplies}</span>
            </div>
          </div>
        </div>

        {post.thumbnailImageURL && (
          <div className="flex-shrink-0">
            <Image
              src={post.thumbnailImageURL || "/placeholder.svg"}
              alt={post.title}
              width={120}
              height={68}
              className="rounded-md object-cover aspect-[16/9]"
            />
          </div>
        )}
      </Link>
    </div>
  )
})

PostItem.displayName = "PostItem"

export default PostItem
