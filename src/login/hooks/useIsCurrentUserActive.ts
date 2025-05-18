import { useQuery } from "@tanstack/react-query";
import { fetchUsersWithBoardPermission } from "@/user/api/user";
import { useAuth } from '@/shared/hooks/useAuth';
import { useRemoteConfig } from "../../shared/hooks/useRemoteConfig";

export function useIsCurrentUserActive() {
    const { value: activeBoardId } = useRemoteConfig('active_board_id', '');
    const { data: userData } = useQuery({
        queryKey: ['userData', activeBoardId],
        queryFn: () => fetchUsersWithBoardPermission([activeBoardId]),
        enabled: !!activeBoardId,
    });
    const { currentUser } = useAuth();
    const isCurrentUserActive = userData?.some((user) => user.uid === currentUser?.uid);

    return { isCurrentUserActive };
}