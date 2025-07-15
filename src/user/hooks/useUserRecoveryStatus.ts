import { useQuery } from '@tanstack/react-query';
import { useUser } from './useUser';
import { RecoveryStatus } from '../model/User';

export function useUserRecoveryStatus(userId: string) {
  const { userData, isLoading: isUserLoading } = useUser(userId);

  const {
    data: recoveryStatus,
    isLoading: isRecoveryLoading,
    error,
  } = useQuery({
    queryKey: ['recoveryStatus', userId],
    queryFn: () => {
      if (!userData) return null;
      return userData.recoveryStatus || 'none';
    },
    enabled: !!userData && !!userId,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    recoveryStatus: (recoveryStatus as RecoveryStatus) || 'none',
    isLoading: isUserLoading || isRecoveryLoading,
    error,
  };
}
