import { MessageCircle } from "lucide-react"
import { Link } from "react-router-dom"
import { getContentPreview } from "@/post/utils/contentUtils"
import { Card, CardContent, CardFooter } from "@/shared/ui/card"
import { Skeleton } from "@/shared/ui/skeleton"
import { formatDate } from "@/shared/utils/dateUtils"
import type { Post } from "@/post/model/Post"

interface PostItemProps {
    post: Post
}

export const PostItem: React.FC<PostItemProps> = ({ post }) => {
    const isPrivate = post.visibility === 'private';
    const contentPreview = getContentPreview(post.content)
    return (
        <Card className="reading-shadow border-border/50 reading-hover active:scale-[0.99] transition-all duration-200">
            <Link to={`/board/${post.boardId}/post/${post.id}`}
                  className="flex gap-4 reading-focus">
                <div className="min-w-0 flex-1">
                    <CardContent className="px-3 md:px-4 py-3 pb-2">
                        <h3 className="truncate text-base font-medium text-foreground">{post.title}</h3>
                        {!isPrivate && (
                          <div
                            className="prose prose-sm line-clamp-2 text-xs text-reading text-muted-foreground mt-1.5 dark:prose-invert prose-p:my-1.5 prose-ol:my-1.5 prose-ul:my-1.5"
                            dangerouslySetInnerHTML={{ __html: contentPreview }}
                          />
                        )}
                    </CardContent>
                    <CardFooter className="flex items-center justify-between px-3 md:px-4 pb-3 pt-0 text-xs text-muted-foreground">
                        <span>{formatDate(post.createdAt?.toDate())}</span>
                        <div className="flex items-center">
                            <MessageCircle className="mr-1 size-3" />
                            <span>{post.countOfComments + post.countOfReplies}</span>
                        </div>
                    </CardFooter>
                </div>
                {post.thumbnailImageURL && (
                    <div className="flex shrink-0 items-center pr-3 md:pr-4">
                        <img
                            src={post.thumbnailImageURL || "/placeholder.svg"}
                            alt={post.title}
                            width={120}
                            height={68}
                            className="aspect-[16/9] rounded-lg object-cover reading-shadow"
                        />
                    </div>
                )}
            </Link>
        </Card>
    )
}

export function PostItemSkeleton() {
    return (
      <Card className="reading-shadow border-border/50">
        <div className="flex gap-4">
          <div className="min-w-0 flex-1">
            <CardContent className="px-3 md:px-4 py-3 pb-2">
              <Skeleton className="mb-2 h-5 w-3/4" />
              <Skeleton className="mb-1 h-4 w-full" />
            </CardContent>
            <CardFooter className="flex items-center justify-between px-3 md:px-4 pb-3 pt-0 text-xs">
              <Skeleton className="h-3 w-20" />
              <div className="flex items-center gap-1">
                <Skeleton className="size-3 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            </CardFooter>
          </div>
          <div className="flex shrink-0 items-center pr-3 md:pr-4">
            <Skeleton className="h-[68px] w-[120px] rounded-lg" />
          </div>
        </div>
      </Card>
    )
}
  
