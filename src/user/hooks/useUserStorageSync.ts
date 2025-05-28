import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

// storage 이벤트를 통한 탭 동기화 커스텀 훅
export function useUserStorageSync(uid: string | null, cacheVersion: string | undefined) {
    const queryClient = useQueryClient();
    React.useEffect(() => {
      if (!uid || !cacheVersion) return;
      function handleStorage(e: StorageEvent) {
        if (e.key === `${cacheVersion}-user-${uid}`) {
          queryClient.invalidateQueries(['user', uid]);
        }
      }
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }, [uid, queryClient, cacheVersion]);
  }