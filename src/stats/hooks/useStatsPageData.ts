import { useQueryClient } from "@tanstack/react-query"
import { useRegisterTabHandler } from "@/shared/contexts/BottomTabHandlerContext"
import { useRemoteConfig } from "@/shared/hooks/useRemoteConfig"
import { useWritingStatsV2 } from "@/stats/hooks/useWritingStatsV2"
import { useUserInBoard } from "@/user/hooks/useUserInBoard"
import { useCommentingStats } from "@/stats/hooks/useCommentingStats"
import { useAuth } from '@/shared/hooks/useAuth';
import { getBlockedByUsers } from '@/user/api/user';
import { useQuery } from '@tanstack/react-query';

/**
 * 통계 페이지 데이터 훅 (내 blockedBy 기반 클라이언트 필터링)
 * @param tab 'posting' | 'commenting'
 */
type TabType = 'posting' | 'commenting';

export function useStatsPageData(tab: TabType) {
    const queryClient = useQueryClient();
    const { value: activeBoardId } = useRemoteConfig<string>('active_board_id', '5rfpfRBuhRFZB13dJVy8');
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
    } = useWritingStatsV2(filteredActiveUsers.map(u => u.uid));
    const { 
        data: commentingStats, 
        isLoading: isLoadingCommenting, 
        error: commentingError 
    } = useCommentingStats(filteredActiveUsers.map(u => u.uid));
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
