import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import { fetchBoardById } from "@/utils/boardUtils";
import { Board } from "@/types/Board";

// 캐시 키를 생성하는 헬퍼 함수
const getCacheKey = (boardId: string | null) => {
    if (!boardId) return null;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return `upcomingBoard-${boardId}-${year}-${month}`;
};

export function useUpcomingBoard(): UseQueryResult<Board | null> {
    const { value: upcomingBoardId } = useRemoteConfig('upcoming_board_id', null);
    const cacheKey = getCacheKey(upcomingBoardId);

    return useQuery({
        queryKey: ["upcomingBoard", cacheKey],
        queryFn: async () => {
            if (!upcomingBoardId) return null;
            try {
                const board = await fetchBoardById(upcomingBoardId);
                return { ...board, id: upcomingBoardId };
            } catch (error) {
                console.error('Error fetching upcoming board:', error);
                return null;
            }
        },
        enabled: !!upcomingBoardId,
        staleTime: 1000 * 60 * 60, // 1시간 동안 fresh 상태 유지
        cacheTime: 1000 * 60 * 60 * 24, // 24시간 동안 캐시 유지
        refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 리페치 비활성화
        refetchOnMount: false, // 컴포넌트 마운트 시 자동 리페치 비활성화
        refetchOnReconnect: false, // 네트워크 재연결 시 자동 리페치 비활성화
    });
}