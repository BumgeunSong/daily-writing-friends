import { MessageCircle, Lock } from "lucide-react"
import { type Post, PostVisibility } from "@/post/model/Post"
import { getContentPreview } from "@/post/utils/contentUtils"
import { Badge } from "@/shared/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/card"
import { useUser } from "@/user/hooks/useUser"
import { PostUserProfile } from './PostUserProfile'
import type React from "react"

interface PostCardProps {
  post: Post
  onClick: (postId: string) => void
  onClickProfile?: (userId: string) => void
  isKnownBuddy: boolean
}

// 키보드 접근성: role="button"에서 Enter/Space로 클릭 지원
function handleKeyDown(e: React.KeyboardEvent, onClick: (e: any) => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onClick(e);
  }
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick, onClickProfile, isKnownBuddy }) => {
  const { userData: authorData, isLoading: isAuthorLoading } = useUser(post.authorId)
  const isPrivate = post.visibility === PostVisibility.PRIVATE
  const contentPreview = !isPrivate ? getContentPreview(post.content) : null

  const handleCardClick = () => {
    onClick(post.id)
  }

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClickProfile && post.authorId) {
      onClickProfile(post.authorId);
    }
  }

  return (
    <Card
      className="transition-all duration-200 hover:border-border/80 hover:bg-muted/50 hover:shadow-sm"
    >
      <CardHeader className="px-4 pb-2 pt-3">
        <div className="mb-2 flex items-center">
          <PostUserProfile
            authorData={authorData}
            isLoading={isAuthorLoading}
            isKnownBuddy={isKnownBuddy}
            onClickProfile={handleProfileClick}
          />
        </div>
        <h2 className="flex items-center text-xl font-semibold text-foreground/90">
          {isPrivate && <Lock className="mr-1.5 size-4 shrink-0 text-muted-foreground" aria-label="비공개 글" />}
          {post.title}
        </h2>
      </CardHeader>
      <CardContent
        className="px-4 pb-3 pt-1 cursor-pointer min-h-[44px] active:bg-primary/10 active:scale-[0.98] transition-all duration-150"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        aria-label="게시글 상세로 이동"
        onKeyDown={e => handleKeyDown(e, handleCardClick)}
      >
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
      <CardFooter
        className="flex justify-between border-t border-border/30 px-4 pb-3 pt-2 cursor-pointer min-h-[44px] active:bg-primary/10 active:scale-[0.98] transition-all duration-150"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        aria-label="게시글 상세로 이동"
        onKeyDown={e => handleKeyDown(e, handleCardClick)}
      >
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
