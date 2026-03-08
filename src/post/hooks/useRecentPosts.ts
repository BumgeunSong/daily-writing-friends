import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchRecentPosts } from '@/post/api/post';
import type { Post } from '@/post/model/Post';
import { useAuth } from '@/shared/hooks/useAuth';
import { useBlockedByUsers } from '@/user/hooks/useBlockedByUsers';

/**
 * 최근 게시글 목록을 불러오는 커스텀 훅 (createdAt 내림차순, blockedBy 기반 서버사이드 필터링)
 * @param boardId 게시판 ID
 * @param limitCount 페이지당 글 개수
 */
export const useRecentPosts = (
    boardId: string,
    limitCount: number
) => {
    const { currentUser } = useAuth();
    const blockedByUsers = useBlockedByUsers();
    const queryResult = useInfiniteQuery<Post[]>(
        ['posts', boardId, blockedByUsers],
        ({ pageParam = null }) => fetchRecentPosts(boardId, limitCount, blockedByUsers, pageParam),
        {
            enabled: !!boardId && !!currentUser?.uid,
            getNextPageParam: (lastPage) => {
                const lastPost = lastPage[lastPage.length - 1];
                return lastPost ? lastPost.createdAt.toDate() : undefined;
            },
            // Remove local error handling - now handled globally
            // Add metadata for better error context
            meta: {
                errorContext: 'Loading board posts',
                feature: 'board-view',
                boardId,
            },
            staleTime: 1000 * 30, // 30 seconds
            cacheTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: true, // Refetch when the window regains focus
        }
    );

    return {
        ...queryResult,
        blockedByUsers,
    };
};