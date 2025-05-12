import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Board } from "@/board/model/Board";
import * as boardUtils from '@/board/utils/boardUtils';
import { useRemoteConfig } from "@shared/hooks/useRemoteConfig";

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
    // Remote Config에서 upcoming_board_id 값 가져오기
    const { value: upcomingBoardId } = useRemoteConfig('upcoming_board_id', null);
    const cacheKey = getCacheKey(upcomingBoardId);

    return useQuery({
        queryKey: ["upcomingBoard", cacheKey],
        queryFn: async () => {
            // 보드 ID가 없으면 null 반환
            if (!upcomingBoardId) {
                return null;
            }
            
            try {
                const board = await boardUtils.fetchBoardById(upcomingBoardId);
                // board가 null이 아닌 경우에만 ID를 추가
                return board ? { ...board, id: upcomingBoardId } : null;
            } catch (error) {
                console.error('Error fetching upcoming board:', error);
                return null;
            }
        },
        enabled: !!upcomingBoardId, // 보드 ID가 있을 때만 쿼리 활성화
        staleTime: 1000 * 60 * 60, // 1시간 동안 fresh 상태 유지
        cacheTime: 1000 * 60 * 60 * 24, // 24시간 동안 캐시 유지
        refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 리페치 비활성화
        refetchOnMount: false, // 컴포넌트 마운트 시 자동 리페치 비활성화
        refetchOnReconnect: false, // 네트워크 재연결 시 자동 리페치 비활성화
    });
}