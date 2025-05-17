import { Link } from "react-router-dom"
import { MessageCircle } from "lucide-react"
import { formatDate } from "@/shared/utils/dateUtils"
import type { Post } from "@/post/model/Post"
import { getContentPreview } from "@/post/utils/contentUtils"
import { Card, CardContent, CardFooter } from "@/shared/ui/card"
import { Skeleton } from "@/shared/ui/skeleton"

interface PostItemProps {
    post: Post
}

export const PostItem: React.FC<PostItemProps> = ({ post }) => {
    const isPrivate = post.visibility === 'private';
    const contentPreview = getContentPreview(post.content)
    return (
        <Card className="hover:border-primary transition-colors my-2">
            <Link to={`/board/${post.boardId}/post/${post.id}`}
                  className="flex gap-4">
                <div className="flex-1 min-w-0">
                    <CardContent className="p-4 pb-2">
                        <h3 className="font-medium text-base truncate">{post.title}</h3>
                        {!isPrivate && (
                          <div
                            className="prose prose-sm line-clamp-1 leading-relaxed text-xs text-foreground/80 dark:prose-invert prose-p:my-1 prose-ol:my-1 prose-ul:my-1"
                            dangerouslySetInnerHTML={{ __html: contentPreview }}
                          />
                        )}
                    </CardContent>
                    <CardFooter className="flex items-center justify-between px-4 pt-0 pb-3 text-[11px] text-muted-foreground">
                        <span>{formatDate(post.createdAt?.toDate())}</span>
                        <div className="flex items-center">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            <span>{post.countOfComments + post.countOfReplies}</span>
                        </div>
                    </CardFooter>
                </div>
                {post.thumbnailImageURL && (
                    <div className="flex-shrink-0 flex items-center pr-2">
                        <img
                            src={post.thumbnailImageURL || "/placeholder.svg"}
                            alt={post.title}
                            width={120}
                            height={68}
                            className="rounded-md object-cover aspect-[16/9]"
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
          <div className="flex-1 min-w-0">
            <CardContent className="p-4 pb-2">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
            </CardContent>
            <CardFooter className="flex items-center justify-between px-4 pt-0 pb-3 text-[11px]">
              <Skeleton className="h-3 w-20" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            </CardFooter>
          </div>
          <div className="flex-shrink-0 flex items-center pr-2">
            <Skeleton className="h-[68px] w-[120px] rounded-md" />
          </div>
        </div>
      </Card>
    )
}
  
