import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Board } from "@/board/model/Board";
import * as boardUtils from '@/board/utils/boardUtils';
import { useRemoteConfig } from '@/shared/hooks/useRemoteConfig';

/**
 * 캐시 키를 생성하는 헬퍼 함수
 * @param boardId 보드 ID (null일 수 있음)
 * @returns 캐시 키 또는 null
 */
const getCacheKey = (boardId: string | null): string | null => {
    return boardId ? `upcomingBoard-${boardId}-${getYearMonth()}` : null;
};

/**
 * 연도-월 문자열을 반환하는 헬퍼 함수
 * @returns 'YYYY-MM' 형식의 문자열
 */
const getYearMonth = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
};

/**
 * 다가오는 보드 정보를 가져오는 훅
 * Remote Config에서 upcoming_board_id를 읽어와 해당 보드 정보를 조회합니다.
 * @returns UseQueryResult<Board | null> 쿼리 결과 (data 속성에 보드 정보 또는 null)
 */
export function useUpcomingBoard(): UseQueryResult<Board | null> {
    const { value: upcomingBoardId } = useRemoteConfig('upcoming_board_id', null);
    const cacheKey = getCacheKey(upcomingBoardId);

    return useQuery({
        queryKey: ["upcomingBoard", cacheKey],
        queryFn: async () => {
            if (!upcomingBoardId) {
                return null;
            }
            try {
                const board = await boardUtils.fetchBoardById(upcomingBoardId);
                return board ? { ...board, id: upcomingBoardId } : null;
            } catch (error) {
                console.error('Error fetching upcoming board:', error);
                return null;
            }
        },
        enabled: !!upcomingBoardId,
        staleTime: 1000 * 60 * 60,
        cacheTime: 1000 * 60 * 60 * 24,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
    });
}