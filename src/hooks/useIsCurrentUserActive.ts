import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllUserDataWithBoardPermission } from "@/utils/userUtils";
import { useRemoteConfig } from "./useRemoteConfig";

export function useIsCurrentUserActive() {
    const { value: activeBoardId } = useRemoteConfig('active_board_id', '');
    const { data: userData } = useQuery({
        queryKey: ['userData', activeBoardId],
        queryFn: () => fetchAllUserDataWithBoardPermission([activeBoardId]),
        enabled: !!activeBoardId,
    });
    const { currentUser } = useAuth();
    const isCurrentUserActive = userData?.some((user) => user.uid === currentUser?.uid);

    return { isCurrentUserActive };
}