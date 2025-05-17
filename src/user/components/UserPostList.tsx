import { useUserPosts } from "../hooks/useUserPosts"
import PostItem from "@/user/components/UserPostItem"
import { Skeleton } from "@/shared/ui/skeleton"
import type { Post } from "@/post/model/Post"
import { useInfiniteScroll } from "@/notification/hooks/useInfiniteScroll"

interface UserPostsListProps {
  userId: string
}

export default function UserPostsList({ userId }: UserPostsListProps) {
  // 사용자의 게시글 가져오기
  const {
    data: postsPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUserPosts(userId);

  // 모든 페이지의 게시글을 하나의 배열로 합치기
  const allPosts: Post[] = postsPages?.pages.flatMap((page: Post[]) => page) || [];

  // 무한 스크롤 커스텀 훅 사용
  const { observerRef } = useInfiniteScroll({
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  });

  if (isLoading && allPosts.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostItemSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (allPosts.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-muted-foreground">No posts found</p>
      </div>
    )
  }

  return (
    <div>
      {allPosts.map((post, index) => (
        <PostItem key={post.id} post={post} ref={index === allPosts.length - 1 ? observerRef : undefined} />
      ))}

      {isLoading && allPosts.length > 0 && (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">Loading more posts...</p>
        </div>
      )}

      {!hasNextPage && allPosts.length > 0 && (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">No more posts</p>
        </div>
      )}
    </div>
  )
}

function PostItemSkeleton() {
  return (
    <div className="flex border rounded-md p-4 gap-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
      <Skeleton className="h-20 w-36 rounded-md" />
    </div>
  )
}
