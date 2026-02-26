import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import type { Board } from "@/board/model/Board";
import * as boardUtils from '@/board/utils/boardUtils';
import { REMOTE_CONFIG_KEYS, CACHE_CONSTANTS } from '@/login/constants';
import { formatYearMonth, createBoardCacheKey, transformBoardWithId } from '@/login/utils/loginUtils';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';

/**
 * 다가오는 보드 정보를 가져오는 훅
 * Remote Config에서 upcoming_board_id를 읽어와 해당 보드 정보를 조회합니다.
 * @returns UseQueryResult<Board | null> 쿼리 결과 (data 속성에 보드 정보 또는 null)
 */
export function useUpcomingBoard(): UseQueryResult<Board | null> {
    const { value: upcomingBoardId } = useRemoteConfig(REMOTE_CONFIG_KEYS.UPCOMING_BOARD_ID);
    const cacheKey = createBoardCacheKey(upcomingBoardId, formatYearMonth());

    return useQuery({
        queryKey: ["upcomingBoard", cacheKey],
        queryFn: async () => {
            if (!upcomingBoardId) {
                return null;
            }
            try {
                const board = await boardUtils.fetchBoardById(upcomingBoardId);
                if (!board) {
                    console.warn(`useUpcomingBoard: No board found for upcoming_board_id="${upcomingBoardId}". This may indicate the board was not migrated to Supabase.`);
                }
                return transformBoardWithId(board, upcomingBoardId);
            } catch (error) {
                console.error('Error fetching upcoming board:', error);
                return null;
            }
        },
        enabled: !!upcomingBoardId,
        staleTime: CACHE_CONSTANTS.STALE_TIME,
        cacheTime: CACHE_CONSTANTS.CACHE_TIME,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
    });
}