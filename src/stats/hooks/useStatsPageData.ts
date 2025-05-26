import { useQueryClient } from "@tanstack/react-query"
import { useRegisterTabHandler } from "@/shared/contexts/BottomTabHandlerContext"
import { useRemoteConfig } from "@/shared/hooks/useRemoteConfig"
import { useWritingStatsV2 } from "@/stats/hooks/useWritingStatsV2"
import { useUserInBoard } from "@/user/hooks/useUserInBoard"
import { useCommentingStats } from "@/stats/hooks/useCommentingStats"
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchUser } from '@/user/api/user';
import { useQuery } from '@tanstack/react-query';

/**
 * 통계 페이지 데이터 훅 (내 blockedBy 기반 클라이언트 필터링)
 * @param tab 'posting' | 'commenting'
 */
type TabType = 'posting' | 'commenting';

export function useStatsPageData(tab: TabType) {
    const queryClient = useQueryClient();
    // Remote Config에서 활성 게시판 ID 가져오기
    const { 
        value: activeBoardId, 
        isLoading: isLoadingConfig,
        error: configError
    } = useRemoteConfig<string>(
        'active_board_id', 
        '5rfpfRBuhRFZB13dJVy8' // 기본값을 문자열로 변경
    );
    // 활성 게시판 권한이 있는 사용자 가져오기
    const { users: activeUsers, isLoading: isLoadingUsers, error: usersError } = useUserInBoard(
      activeBoardId ? [activeBoardId] : []
    );
    // 내 blockedBy(나를 차단한 유저 uid 배열) 가져오기
    const { currentUser } = useAuth();
    const {
        data: user,
        isLoading: isUserLoading,
        error: userError
    } = useQuery(['user', currentUser?.uid], () => currentUser?.uid ? fetchUser(currentUser.uid) : null, {
        enabled: !!currentUser?.uid,
        suspense: false,
    });
    const blockedBy = Array.isArray(user?.blockedBy) ? user.blockedBy : [];
    // blockedBy에 포함된 유저 제외
    const filteredUserIds = activeUsers
        .filter(u => !blockedBy.includes(u.uid))
        .map(u => u.uid);
    // 사용자 ID 배열로 통계 가져오기
    const { 
        data: writingStats, 
        isLoading: isLoadingStats, 
        error: statsError 
    } = useWritingStatsV2(filteredUserIds);
    const { 
        data: commentingStats, 
        isLoading: isLoadingCommenting, 
        error: commentingError 
    } = useCommentingStats(filteredUserIds);
    const isLoading = isLoadingConfig || isLoadingUsers || isUserLoading || (tab === 'posting' ? isLoadingStats : isLoadingCommenting);
    const error = configError || usersError || userError || (tab === 'posting' ? statsError : commentingError);
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
        activeUsers,
        writingStats,
        commentingStats,
        isLoading,
        error,
        isLoadingCommenting
    };
}
