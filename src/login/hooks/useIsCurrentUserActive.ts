import { useQuery } from "@tanstack/react-query";
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchUsersWithBoardPermission } from "@/user/api/user";
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext";

export function useIsCurrentUserActive() {
    const { value: activeBoardId } = useRemoteConfig('active_board_id');
    const { data: userData } = useQuery({
        queryKey: ['userData', activeBoardId],
        queryFn: () => fetchUsersWithBoardPermission([activeBoardId]),
        enabled: !!activeBoardId,
    });
    const { currentUser } = useAuth();
    const isCurrentUserActive = userData?.some((user) => user.uid === currentUser?.uid);

    return { isCurrentUserActive };
}