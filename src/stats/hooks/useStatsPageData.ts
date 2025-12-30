import { useQueryClient } from "@tanstack/react-query"
import { useQuery } from '@tanstack/react-query';
import { useRegisterTabHandler } from "@/shared/contexts/BottomTabHandlerContext"
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext"
import { useAuth } from '@/shared/hooks/useAuth';
import { useCommentingStats } from "@/stats/hooks/useCommentingStats"
import { useWritingStats } from "@/stats/hooks/useWritingStats"
import { getBlockedByUsers } from '@/user/api/user';
import { useUserInBoard } from "@/user/hooks/useUserInBoard"

/**
 * 통계 페이지 데이터 훅 (내 blockedBy 기반 클라이언트 필터링)
 * @param tab 'posting' | 'commenting'
 */
type TabType = 'posting' | 'commenting';

export function useStatsPageData(tab: TabType) {
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

    const {
        data: writingStats,
        isLoading: isLoadingStats,
        error: statsError
    } = useWritingStats(filteredActiveUsers, currentUser?.uid);
    const {
        data: commentingStats,
        isLoading: isLoadingCommenting,
        error: commentingError
    } = useCommentingStats(filteredActiveUsers, currentUser?.uid);
    const isLoading = isLoadingUsers || isLoadingStats || isLoadingCommenting;
    const error = usersError || statsError || commentingError;
    // 통계 새로고침 핸들러
    const handleRefreshStats = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // 2. 통계 관련 쿼리 캐시 무효화
        queryClient.invalidateQueries(['activeUsers', activeBoardId]);
        queryClient.invalidateQueries(['writingStatsV2']);
        queryClient.invalidateQueries(['commentingStats']);
    };
    // Stats 탭 핸들러 등록
    useRegisterTabHandler('Stats', handleRefreshStats);
    return {
        filteredActiveUsers,
        writingStats,
        commentingStats,
        isLoading,
        error,
        isLoadingCommenting
    };
}
