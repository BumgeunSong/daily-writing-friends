import { updateProfile } from 'firebase/auth';
import { useMutation } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { useToast } from '@/shared/hooks/use-toast';
import { updateUserInFirestore, uploadUserProfilePhoto } from '@/user/api/user';
import { User } from '../model/User';
import { useAuth } from '@/shared/hooks/useAuth';

interface UpdateUserDataParams {
  userId: string;
  nickname: string;
  profilePhotoFile: File | null;
  bio?: string;
}

export function useUpdateUserData() {
  const { toast } = useToast();
  const { currentUser } = useAuth();

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

      await updateUserInFirestore(userId, updates);

      if (currentUser && currentUser.uid === userId) {
        await updateProfile(currentUser, { displayName: nickname });
      }
    },
    onSuccess: () => {
      toast({
        title: '성공',
        description: '프로필이 업데이트되었습니다.',
      });
    },
    onError: (err: unknown) => {
      Sentry.captureException(err);
      toast({
        title: '오류',
        description: '프로필 업데이트 중 문제가 발생했습니다.',
        variant: 'destructive',
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