import { useQuery } from '@tanstack/react-query';
import { useUser } from './useUser';
import { RecoveryStatus } from '../model/User';

export function useUserRecoveryStatus(userId: string) {
    const { data: user, isLoading: isUserLoading } = useUser(userId);

    const { data: recoveryStatus, isLoading: isRecoveryLoading, error } = useQuery({
        queryKey: ['recoveryStatus', userId],
        queryFn: () => {
            if (!user) return null;
            return user.recoveryStatus || 'none';
        },
        enabled: !!user && !!userId,
        staleTime: 30 * 1000, // 30 seconds
        cacheTime: 2 * 60 * 1000, // 2 minutes
    });

    return {
        recoveryStatus: recoveryStatus as RecoveryStatus || 'none',
        isLoading: isUserLoading || isRecoveryLoading,
        error,
    };
}