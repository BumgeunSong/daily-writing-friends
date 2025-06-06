import * as Sentry from '@sentry/react';
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from '@/shared/hooks/useAuth';
import { getBlockedByUsers } from '@/user/api/user';
import { Post } from '@/post/model/Post';
import { fetchPosts } from '@/post/api/post';
import { useState, useEffect } from 'react';

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
            onError: (error) => {
                console.error("게시글 데이터를 불러오던 중 에러가 발생했습니다:", error);
                Sentry.captureException(error);
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