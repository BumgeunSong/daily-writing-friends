import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, useEffect } from 'react';
import { fetchPosts } from '@/post/api/post';
import { Post } from '@/post/model/Post';
import { useAuth } from '@/shared/hooks/useAuth';
import { getBlockedByUsers } from '@/user/api/user';

/**
 * 게시글 목록을 불러오는 커스텀 훅 (blockedBy 기반 서버사이드 필터링)
 * @param boardId 게시판 ID
 * @param limitCount 페이지당 글 개수
 */
export const usePosts = (
    boardId: string,
    limitCount: number
) => {
    const { currentUser } = useAuth();
    const [blockedByUsers, setBlockedByUsers] = useState<string[]>([]);
    useEffect(() => {
      if (currentUser?.uid) {
        getBlockedByUsers(currentUser.uid).then(setBlockedByUsers);
      }
    }, [currentUser?.uid]);
    const queryResult = useInfiniteQuery<Post[]>(
        ['posts', boardId, blockedByUsers],
        ({ pageParam = null }) => fetchPosts(boardId, limitCount, blockedByUsers, pageParam),
        {
            enabled: !!boardId && !!currentUser?.uid,
            getNextPageParam: (lastPage) => {
                const lastPost = lastPage[lastPage.length - 1];
                return lastPost ? lastPost.createdAt?.toDate() : undefined;
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