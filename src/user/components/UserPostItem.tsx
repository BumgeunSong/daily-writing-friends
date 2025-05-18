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
        <Card className="my-2 transition-colors hover:border-primary">
            <Link to={`/board/${post.boardId}/post/${post.id}`}
                  className="flex gap-4">
                <div className="min-w-0 flex-1">
                    <CardContent className="p-4 pb-2">
                        <h3 className="truncate text-base font-medium">{post.title}</h3>
                        {!isPrivate && (
                          <div
                            className="prose prose-sm line-clamp-1 text-xs leading-relaxed text-foreground/80 dark:prose-invert prose-p:my-1 prose-ol:my-1 prose-ul:my-1"
                            dangerouslySetInnerHTML={{ __html: contentPreview }}
                          />
                        )}
                    </CardContent>
                    <CardFooter className="flex items-center justify-between px-4 pb-3 pt-0 text-[11px] text-muted-foreground">
                        <span>{formatDate(post.createdAt?.toDate())}</span>
                        <div className="flex items-center">
                            <MessageCircle className="mr-1 size-3" />
                            <span>{post.countOfComments + post.countOfReplies}</span>
                        </div>
                    </CardFooter>
                </div>
                {post.thumbnailImageURL && (
                    <div className="flex shrink-0 items-center pr-2">
                        <img
                            src={post.thumbnailImageURL || "/placeholder.svg"}
                            alt={post.title}
                            width={120}
                            height={68}
                            className="aspect-[16/9] rounded-md object-cover"
                        />
                    </div>
                )}
            </Link>
        </Card>
    )
}

export function PostItemSkeleton() {
    return (
      <Card>
        <div className="flex gap-4">
          <div className="min-w-0 flex-1">
            <CardContent className="p-4 pb-2">
              <Skeleton className="mb-2 h-5 w-3/4" />
              <Skeleton className="mb-1 h-4 w-full" />
            </CardContent>
            <CardFooter className="flex items-center justify-between px-4 pb-3 pt-0 text-[11px]">
              <Skeleton className="h-3 w-20" />
              <div className="flex items-center gap-1">
                <Skeleton className="size-3 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            </CardFooter>
          </div>
          <div className="flex shrink-0 items-center pr-2">
            <Skeleton className="h-[68px] w-[120px] rounded-md" />
          </div>
        </div>
      </Card>
    )
}
  
