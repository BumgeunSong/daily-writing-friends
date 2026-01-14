import { useQueryClient } from "@tanstack/react-query"
import { useQuery } from '@tanstack/react-query';
import { useRegisterTabHandler } from "@/shared/contexts/BottomTabHandlerContext"
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext"
import { useAuth } from '@/shared/hooks/useAuth';
import { useCommentingStats } from "@/stats/hooks/useCommentingStats"
import { useCurrentUserCommentingStats } from "@/stats/hooks/useCurrentUserCommentingStats"
import { useCurrentUserWritingStats } from "@/stats/hooks/useCurrentUserWritingStats"
import { useWritingStats } from "@/stats/hooks/useWritingStats"
import { mergeCurrentUserFirst } from "@/stats/utils/mergeStatsUtils"
import { getBlockedByUsers } from '@/user/api/user';
import { useUserInBoard } from "@/user/hooks/useUserInBoard"

type TabType = 'posting' | 'commenting';

export function useStatsPageData(_tab: TabType) {
    const queryClient = useQueryClient();
    const { value: activeBoardId } = useRemoteConfig('active_board_id');
    const { users: activeUsers, isLoading: isLoadingUsers, error: usersError } = useUserInBoard(
      activeBoardId ? [activeBoardId] : []
    );
    const { currentUser } = useAuth();
    const { data: blockedByUsers = [] } = useQuery(
      ['blockedByUsers', currentUser?.uid],
      () => getBlockedByUsers(currentUser!.uid),
      {
        enabled: !!currentUser?.uid,
        initialData: [],
      }
    );

    const filteredActiveUsers = activeUsers.filter(u => !blockedByUsers.includes(u.uid));
    const currentUserData = filteredActiveUsers.find(u => u.uid === currentUser?.uid);
    const otherUsers = filteredActiveUsers.filter(u => u.uid !== currentUser?.uid);

    // Priority: Load current user stats first (fast path)
    const {
        data: currentUserWritingStats,
        isLoading: isLoadingCurrentUserWritingStats,
    } = useCurrentUserWritingStats(currentUserData);
    const {
        data: currentUserCommentingStats,
        isLoading: isLoadingCurrentUserCommentingStats,
    } = useCurrentUserCommentingStats(currentUserData);

    // Then load other users' stats (excluding current user to avoid duplicate fetch)
    const {
        data: otherUsersWritingStats,
        isLoading: isLoadingStats,
        error: statsError
    } = useWritingStats(otherUsers, currentUser?.uid);
    const {
        data: otherUsersCommentingStats,
        isLoading: isLoadingCommenting,
        error: commentingError
    } = useCommentingStats(otherUsers, currentUser?.uid);

    // Merge current user stats (priority loaded) with other users' stats
    const writingStats = mergeCurrentUserFirst(currentUserWritingStats, otherUsersWritingStats);
    const commentingStats = mergeCurrentUserFirst(currentUserCommentingStats, otherUsersCommentingStats);

    const isLoading = isLoadingUsers || isLoadingStats || isLoadingCommenting;
    const isCurrentUserWritingReady = !isLoadingCurrentUserWritingStats && !!currentUserWritingStats;
    const isCurrentUserCommentingReady = !isLoadingCurrentUserCommentingStats && !!currentUserCommentingStats;
    const error = usersError || statsError || commentingError;
    // 통계 새로고침 핸들러
    const handleRefreshStats = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // 통계 관련 쿼리 캐시 무효화
        queryClient.invalidateQueries(['activeUsers', activeBoardId]);
        queryClient.invalidateQueries(['writingStatsV2']);
        queryClient.invalidateQueries(['commentingStats']);
        queryClient.invalidateQueries(['currentUserWritingStats']);
        queryClient.invalidateQueries(['currentUserCommentingStats']);
    };
    // Stats 탭 핸들러 등록
    useRegisterTabHandler('Stats', handleRefreshStats);
    return {
        filteredActiveUsers,
        otherUsersCount: otherUsers.length,
        currentUserId: currentUser?.uid,
        currentUserWritingStats,
        currentUserCommentingStats,
        isCurrentUserWritingReady,
        isCurrentUserCommentingReady,
        writingStats,
        commentingStats,
        isLoading,
        error,
        isLoadingCommenting
    };
}
