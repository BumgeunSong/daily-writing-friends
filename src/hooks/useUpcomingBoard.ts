import { useRemoteConfig } from "./useRemoteConfig";
import { fetchBoardById } from "@/utils/boardUtils";
import { useQuery } from "@tanstack/react-query";

const DEFAULT_BOARD_ID = '';

export function useUpcomingBoard() {
    const { value: upcomingBoardId } = useRemoteConfig('upcoming_board_id', DEFAULT_BOARD_ID);

    return useQuery({
        queryKey: ['upcomingBoard', upcomingBoardId],
        queryFn: async () => {
            if (!upcomingBoardId) return null;
            return await fetchBoardById(upcomingBoardId);
        },
        enabled: !!upcomingBoardId
    });
}