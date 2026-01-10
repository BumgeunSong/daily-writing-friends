import * as Sentry from '@sentry/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner"
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { useAuth } from '@/shared/hooks/useAuth';
import { updateUser, uploadUserProfilePhoto } from '@/user/api/user';
import { removeCachedUserData } from '@/user/cache/userCache';
import { updateProfile } from 'firebase/auth';
import { User } from '../model/User';

interface UpdateUserDataParams {
  userId: string;
  nickname: string;
  profilePhotoFile: File | null;
  bio?: string;
}

export function useUpdateUserData() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { value: cacheVersion } = useRemoteConfig('user_cache_version');

  const mutation = useMutation({
    mutationFn: async ({ userId, nickname, profilePhotoFile, bio }: UpdateUserDataParams) => {
      if (!userId) throw new Error('사용자 정보를 찾을 수 없습니다.');
      const updates: Partial<User> = { nickname };
      if (bio !== undefined) updates.bio = bio;

      if (profilePhotoFile) {
        const photoURL = await uploadUserProfilePhoto(userId, profilePhotoFile);
        updates.profilePhotoURL = photoURL;
        if (currentUser && currentUser.uid === userId) {
          await updateProfile(currentUser, { photoURL });
        }
      }

      await updateUser(userId, updates);
      
      if (currentUser && currentUser.uid === userId) {
        await updateProfile(currentUser, { displayName: nickname });
      }

      // 캐시 무효화: localStorage에서 해당 유저 캐시 삭제
      removeCachedUserData(userId, cacheVersion ?? 'v2');
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
      toast.success('프로필이 업데이트되었습니다.', {
        position: 'bottom-center',
      });
    },
    onError: (err: unknown) => {
      Sentry.captureException(err);
      toast.error('프로필 업데이트 중 문제가 발생했습니다.', {
        position: 'bottom-center',
      });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isLoading,
    error: mutation.error,
  };
} 