import { useQuery } from "@tanstack/react-query";
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchAllUserDataWithBoardPermission } from "@/user/utils/userUtils";
import { useRemoteConfig } from "../../shared/hooks/useRemoteConfig";

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