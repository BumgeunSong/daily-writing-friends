import { updateProfile } from 'firebase/auth';
import { doc, DocumentData, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useState, FormEvent } from 'react';
import * as Sentry from '@sentry/react';
import { useToast } from '@/shared/hooks/use-toast';
import { firestore, storage, auth } from '../../firebase';

interface UserUpdates extends DocumentData {
  nickname: string;
  bio?: string;
  profilePhotoURL?: string;
}

export function useUpdateUserData(
  userId: string | null,
  nickname: string,
  profilePhotoFile: File | null,
  bio?: string
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) {
      const err = new Error('사용자 정보를 찾을 수 없습니다.');
      setError(err);
      toast({
        title: '오류',
        description: err.message,
        variant: 'destructive',
      });
      Sentry.captureException(err);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updates: UserUpdates = { nickname };
      if (bio !== undefined) updates.bio = bio;

      if (profilePhotoFile) {
        const storageRef = ref(storage, `profilePhotos/${userId}`);
        await uploadBytes(storageRef, profilePhotoFile);
        const photoURL = await getDownloadURL(storageRef);
        updates.profilePhotoURL = photoURL;
        if (auth.currentUser && auth.currentUser.uid === userId) {
          await updateProfile(auth.currentUser, { photoURL });
        }
      }

      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, updates);

      if (auth.currentUser && auth.currentUser.uid === userId) {
        await updateProfile(auth.currentUser, { displayName: nickname });
      }

      toast({
        title: '성공',
        description: '프로필이 업데이트되었습니다.',
      });
    } catch (err) {
      setError(err as Error);
      Sentry.captureException(err);
      toast({
        title: '오류',
        description: '프로필 업데이트 중 문제가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { onSubmit, isLoading, error };
} 