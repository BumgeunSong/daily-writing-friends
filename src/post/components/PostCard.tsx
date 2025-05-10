import { MessageCircle, User, Lock } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Badge } from "@/shared/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/card"
import { Skeleton } from "@/shared/ui/skeleton"
import { useAuthorData } from "@/post/hooks/useAuthorData"
import { type Post, PostVisibility } from "@/post/model/Post"
import { getContentPreview } from "@/post/utils/contentUtils"

import type React from "react"

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
      className="cursor-pointer transition-all duration-200 hover:border-border/80 hover:bg-muted/50 hover:shadow-sm"
    >
      <CardHeader className="px-4 pb-2 pt-3">
        <div className="mb-2 flex items-center">
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

        <h2 className="flex items-center text-xl font-semibold text-foreground/90">
          {isPrivate && <Lock className="mr-1.5 size-4 shrink-0 text-muted-foreground" aria-label="비공개 글" />}
          {post.title}
        </h2>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-1">
        {!isPrivate && contentPreview && (
          <div
            className="
            prose prose-sm line-clamp-3 
            leading-relaxed
            text-foreground/80
            dark:prose-invert
            prose-p:my-1
            prose-ol:my-1
            prose-ul:my-1"
            dangerouslySetInnerHTML={{ __html: contentPreview }}
          />
        )}
        {!isPrivate && post.thumbnailImageURL && (
          <div className="mt-2 aspect-video w-full overflow-hidden rounded-md bg-muted">
            <img src={post.thumbnailImageURL || "/placeholder.svg"} alt="게시글 썸네일" />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t border-border/30 px-4 pb-3 pt-2">
        <div className="flex items-center text-muted-foreground">
          <MessageCircle className="mr-1 size-4" />
          <p className="text-xs font-medium">{post.countOfComments + post.countOfReplies}</p>
        </div>
        {post.weekDaysFromFirstDay !== undefined && (
          <Badge
            variant="outline"
            className="h-5 border-muted-foreground/30 px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
          >
            {post.weekDaysFromFirstDay + 1}일차
          </Badge>
        )}
      </CardFooter>
    </Card>
  )
}

export default PostCard
