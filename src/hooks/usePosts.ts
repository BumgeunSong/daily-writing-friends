import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPosts } from '@/utils/postUtils';
import { cachePostList, getCachedPostList, isOnline } from '@/utils/offlineUtils';
import { useEffect } from 'react';

export const usePosts = (boardId: string, authorId: string | null, limitCount: number) => {
    const query = useInfiniteQuery({
        queryKey: ['posts', boardId, authorId],
        queryFn: async ({ pageParam = null }) => {
            // 오프라인 상태 확인
            if (!isOnline()) {
                // 첫 페이지만 요청하는 경우 캐시에서 데이터 가져오기
                if (pageParam === null) {
                    const cachedPosts = await getCachedPostList(boardId);
                    if (cachedPosts) {
                        return cachedPosts;
                    }
                }
                throw new Error('오프라인 상태이며 캐시된 데이터가 없습니다.');
            }

            // 온라인 상태면 서버에서 데이터 가져오기
            return fetchPosts(boardId, authorId, limitCount, pageParam);
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < limitCount) return undefined;
            return lastPage[lastPage.length - 1]?.createdAt;
        },
        staleTime: 5 * 60 * 1000, // 5분
        cacheTime: 24 * 60 * 60 * 1000, // 24시간
        refetchOnWindowFocus: isOnline(), // 온라인 상태일 때만 창 포커스 시 새로고침
        refetchOnReconnect: true, // 네트워크 재연결 시 새로고침
    });

    // 데이터가 로드되면 캐시에 저장
    useEffect(() => {
        if (query.data && isOnline()) {
            const allPosts = query.data.pages.flatMap((page) => page);
            cachePostList(boardId, allPosts);
        }
    }, [query.data, boardId]);

    return query;
};
