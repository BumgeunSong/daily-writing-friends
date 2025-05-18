import { useRef } from "react"
import { useInfiniteScroll } from "@/notification/hooks/useInfiniteScroll"
import { PostItem, PostItemSkeleton } from "@/user/components/UserPostItem"
import { useUserPosts } from "../hooks/useUserPosts"
import type { Post } from "@/post/model/Post"

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const { observerRef, isLoading: isLoadingMore } = useInfiniteScroll({
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  });
  
  if (isLoading && allPosts.length === 0) {
    return (
      <div>
        {Array.from({ length: 5 }).map((_, i) => (
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
    <div ref={scrollRef}>
      {allPosts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
      <div ref={observerRef} />
      {isLoadingMore && allPosts.length > 0 && (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">더 불러오는 중...</p>
        </div>
      )}
      {!hasNextPage && allPosts.length > 0 && (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">더 이상 게시글이 없습니다.</p>
        </div>
      )}
    </div>
  )
}
