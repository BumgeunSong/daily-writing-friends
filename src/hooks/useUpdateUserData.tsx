import { useNavigate } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateUserData } from '../utils/userUtils';
import { storage } from '../firebase';
import { useState } from 'react';
import { useToast } from './use-toast';
import { ToastAction } from '@/components/ui/toast';

export function useUpdateUserData(
  userId: string,
  nickname: string,
  profilePhoto: File | null
) {
  const navigate = useNavigate();
  const [isLoading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const uploadProfilePhoto = async (file: File, userId: string) => {
    const storageRef = ref(storage, `profilePhotos/${userId}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateUserData(userId, { nickname });

      if (profilePhoto) {
        const downloadURL = await uploadProfilePhoto(profilePhoto, userId);
        await updateUserData(userId, { profilePhotoURL: downloadURL });
      }

      toast({
        title: '정보가 성공적으로 업데이트되었습니다.',
        description: '정보가 바뀌지 않으면 새로고침을 해주세요.',
        action: (
          <ToastAction altText='새로고침' onClick={() => window.location.reload()}>
            새로고침
          </ToastAction>
        ),
      });

      navigate('/account');
    } catch (error) {
      console.error('Error updating account information:', error);
      toast({
        description: '정보를 업데이트하는 중 오류가 발생했습니다. 다시 시도해주세요.'
      });
    } finally {
      setLoading(false);
    }
  };

  return { onSubmit, isLoading };
}
