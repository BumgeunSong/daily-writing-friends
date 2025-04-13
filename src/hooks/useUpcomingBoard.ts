import { useRemoteConfig } from "./useRemoteConfig";
import { fetchBoardById } from "@/utils/boardUtils";
import { useQuery } from "@tanstack/react-query";
const DEFAULT_BOARD_ID = ''

export function useUpcomingBoard() {
    return useQuery({
        queryKey: ['upcomingBoard'],
        queryFn: async () => {
            const { value: upcomingBoardId } = await useRemoteConfig('upcoming_board_id', DEFAULT_BOARD_ID);
            const upcomingBoard = await fetchBoardById(upcomingBoardId);
            return upcomingBoard;
        }
    });
}