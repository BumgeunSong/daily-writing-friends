"use client"

import type React from "react"

import { MessageCircle, User, Lock } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { type Post, PostVisibility } from "@/types/Post"
import { Badge } from "@/components/ui/badge"
import { getContentPreview } from "@/utils/contentUtils"
import { useAuthorData } from "@/hooks/useAuthorData"
import { Skeleton } from "@/components/ui/skeleton"

interface PostCardProps {
  post: Post
  onClick: (postId: string) => void
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  const { authorData, isLoading: isAuthorLoading } = useAuthorData(post.authorId)

  const isPrivate = post.visibility === PostVisibility.PRIVATE
  const contentPreview = !isPrivate ? getContentPreview(post.content) : null

  const handleCardClick = () => {
    onClick(post.id)
  }

  return (
    <Card
      onClick={handleCardClick}
      className="cursor-pointer transition-all duration-200 hover:bg-muted/50 hover:shadow-sm hover:border-border/80"
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center mb-2">
          {isAuthorLoading ? (
            <Skeleton className="size-7 rounded-full" />
          ) : (
            <Avatar className="size-7">
              <AvatarImage src={authorData?.profilePhotoURL || ""} alt={authorData?.realName || "User"} />
              <AvatarFallback>
                <User className="size-3.5" />
              </AvatarFallback>
            </Avatar>
          )}
          <div className="ml-2">
            {isAuthorLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <p className="text-sm font-medium text-foreground/90">{authorData?.nickname || "알 수 없음"}</p>
            )}
          </div>
        </div>

        <h2 className="text-xl font-semibold flex items-center text-foreground/90">
          {isPrivate && <Lock className="size-4 text-muted-foreground mr-1.5 flex-shrink-0" aria-label="비공개 글" />}
          {post.title}
        </h2>
      </CardHeader>
      <CardContent className="px-4 pt-1 pb-3">
        {!isPrivate && contentPreview && (
          <div
            className="
            prose prose-sm dark:prose-invert 
            text-foreground/80
            prose-p:my-1
            prose-ul:my-1
            prose-ol:my-1
            line-clamp-3
            leading-relaxed"
            dangerouslySetInnerHTML={{ __html: contentPreview }}
          />
        )}
        {!isPrivate && post.thumbnailImageURL && (
          <div className="mt-2 aspect-video w-full overflow-hidden rounded-md bg-muted">
            <img src={post.thumbnailImageURL || "/placeholder.svg"} alt="게시글 썸네일" />
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 pb-3 px-4 border-t border-border/30 flex justify-between">
        <div className="flex items-center text-muted-foreground">
          <MessageCircle className="mr-1 size-4" />
          <p className="text-xs font-medium">{post.countOfComments + post.countOfReplies}</p>
        </div>
        {post.weekDaysFromFirstDay !== undefined && (
          <Badge
            variant="outline"
            className="text-xs px-1.5 py-0.5 h-5 font-medium text-muted-foreground border-muted-foreground/30"
          >
            {post.weekDaysFromFirstDay + 1}일차
          </Badge>
        )}
      </CardFooter>
    </Card>
  )
}

export default PostCard
