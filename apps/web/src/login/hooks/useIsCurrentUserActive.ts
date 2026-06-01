import { useQuery } from "@tanstack/react-query";
import { REMOTE_CONFIG_KEYS } from "@/login/constants";
import { isUserInActiveList } from "@/login/utils/loginUtils";
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext";
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchUsersWithBoardPermission } from "@/user/api/user";

export function useIsCurrentUserActive() {
    // Don't gate on !isConfigLoading: REMOTE_CONFIG_DEFAULTS.active_board_id matches
    // the live active board, so the query can fire immediately with the default. If
    // remote-config eventually returns a different value the queryKey changes and
    // TanStack Query refetches — removing this gate strips one sequential Supabase
    // RTT off RootRedirect's critical path.
    const { value: activeBoardId } = useRemoteConfig(REMOTE_CONFIG_KEYS.ACTIVE_BOARD_ID);
    const { data: userData, isLoading } = useQuery({
        queryKey: ['userData', activeBoardId],
        queryFn: () => fetchUsersWithBoardPermission([activeBoardId]),
        enabled: !!activeBoardId,
    });
    const { currentUser } = useAuth();
    const isCurrentUserActive = isUserInActiveList(userData, currentUser?.uid);

    return { isCurrentUserActive, isLoading };
}