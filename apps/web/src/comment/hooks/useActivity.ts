import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchActivityCountsFromSupabase } from '@/shared/api/supabaseReads';

// 메인 훅
export const useActivity = (fromUserId: string, fromDaysAgo: number) => {
    const { currentUser } = useAuth();
    const toUserId = currentUser?.uid;

    const isEnabled = Boolean(fromUserId && toUserId && fromUserId !== toUserId);

    return useQuery({
        queryKey: ['activity', fromUserId, toUserId],
        queryFn: () => fetchActivityCountsFromSupabase(fromUserId, toUserId!, fromDaysAgo),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 1, // 1분
        cacheTime: 1000 * 60 * 30, // 30분
    });
};
