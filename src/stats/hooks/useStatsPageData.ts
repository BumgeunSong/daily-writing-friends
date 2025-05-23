import { useQueryClient } from "@tanstack/react-query"
import { useRegisterTabHandler } from "@/shared/contexts/BottomTabHandlerContext"
import { useRemoteConfig } from "@/shared/hooks/useRemoteConfig"
import { useWritingStatsV2 } from "@/stats/hooks/useWritingStatsV2"
import { useUserInBoard } from "@/user/hooks/useUserInBoard"
import { useCommentingStats } from "@/stats/hooks/useCommentingStats"

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

    // 사용자 ID 배열로 통계 가져오기
    const { 
        data: writingStats, 
        isLoading: isLoadingStats, 
        error: statsError 
    } = useWritingStatsV2(
        activeUsers.map((user) => user.uid)
    );

    const { 
        data: commentingStats, 
        isLoading: isLoadingCommenting, 
        error: commentingError 
    } = useCommentingStats(
        activeUsers.map((user) => user.uid)
    );
    
    const isLoading = isLoadingConfig || isLoadingUsers || (tab === 'posting' ? isLoadingStats : isLoadingCommenting);
    const error = configError || usersError || (tab === 'posting' ? statsError : commentingError);
    
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
