import { useQuery } from "@tanstack/react-query";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import { fetchBoardById } from "@/utils/boardUtils";

export function useUpcomingBoard() {
    const { value: upcomingBoardId } = useRemoteConfig('upcoming_board_id', null);

    return useQuery({
        queryKey: ["upcomingBoard", upcomingBoardId],
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
        enabled: !!upcomingBoardId
    });
}