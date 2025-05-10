import { updateProfile } from 'firebase/auth';
import { doc, DocumentData, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useState, FormEvent } from 'react';
import { useToast } from '@/shared/hooks/use-toast';
import { firestore, storage, auth } from '../../firebase';

interface UserUpdates extends DocumentData {
  nickname: string;
  bio?: string;
  profilePhotoURL?: string;
}

export const useUpdateUserData = (
  userId: string, 
  nickname: string, 
  profilePhotoFile: File | null,
  bio?: string
) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast({
        title: '오류',
        description: '사용자 정보를 찾을 수 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const updates: UserUpdates = { nickname };
      
      // bio가 제공된 경우 업데이트에 추가
      if (bio !== undefined) {
        updates.bio = bio;
      }

      // 프로필 사진이 있으면 업로드
      if (profilePhotoFile) {
        const storageRef = ref(storage, `profilePhotos/${userId}`);
        await uploadBytes(storageRef, profilePhotoFile);
        const photoURL = await getDownloadURL(storageRef);
        
        updates.profilePhotoURL = photoURL;
        
        // 인증 상태의 프로필도 업데이트
        if (auth.currentUser && auth.currentUser.uid === userId) {
          await updateProfile(auth.currentUser, {
            photoURL,
          });
        }
      }

      // 파이어스토어 사용자 문서 업데이트
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, updates);
      
      // 인증 상태의 사용자 이름 업데이트
      if (auth.currentUser && auth.currentUser.uid === userId) {
        await updateProfile(auth.currentUser, {
          displayName: nickname,
        });
      }

      toast({
        title: '성공',
        description: '프로필이 업데이트되었습니다.',
      });
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      toast({
        title: '오류',
        description: '프로필 업데이트 중 문제가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { onSubmit, isLoading };
}; 