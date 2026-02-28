import { useQuery } from "@tanstack/react-query";
import { REMOTE_CONFIG_KEYS } from "@/login/constants";
import { isUserInActiveList } from "@/login/utils/loginUtils";
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext";
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchUsersWithBoardPermission } from "@/user/api/user";

export function useIsCurrentUserActive() {
    const { value: activeBoardId, isLoading: isConfigLoading } = useRemoteConfig(REMOTE_CONFIG_KEYS.ACTIVE_BOARD_ID);
    const { data: userData, isLoading } = useQuery({
        queryKey: ['userData', activeBoardId],
        queryFn: () => fetchUsersWithBoardPermission([activeBoardId]),
        enabled: !!activeBoardId && !isConfigLoading,
    });
    const { currentUser } = useAuth();
    const isCurrentUserActive = isUserInActiveList(userData, currentUser?.uid);

    return { isCurrentUserActive, isLoading: isLoading || isConfigLoading };
}