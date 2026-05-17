import * as Sentry from '@sentry/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/shared/hooks/useAuth';
import { updateUser } from '@/user/api/user';
import { removeCachedUserData } from '@/user/cache/userCache';
import { updateAuthUserMetadata } from '@/shared/auth/supabaseAuth';
import type { User } from '../model/User';

interface UpdateUserDataParams {
  userId: string;
  nickname: string;
  // Pre-uploaded download URL from the avatar upload pipeline (resize + upload
  // happens on file select in useProfilePhoto, not here).
  profilePhotoURL?: string | null;
  bio?: string;
}

export function useUpdateUserData() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ userId, nickname, profilePhotoURL, bio }: UpdateUserDataParams) => {
      if (!userId) throw new Error('사용자 정보를 찾을 수 없습니다.');
      const updates: Partial<User> = { nickname };
      if (bio !== undefined) updates.bio = bio;

      if (profilePhotoURL) {
        updates.profilePhotoURL = profilePhotoURL;
        if (currentUser && currentUser.uid === userId) {
          await updateAuthUserMetadata({ avatar_url: profilePhotoURL });
        }
      }

      await updateUser(userId, updates);

      if (currentUser && currentUser.uid === userId) {
        await updateAuthUserMetadata({ full_name: nickname });
      }

      // 캐시 무효화: localStorage에서 해당 유저 캐시 삭제
      removeCachedUserData(userId, 'v2');
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
