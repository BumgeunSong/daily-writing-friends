import { useNavigate } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateUserData } from '../utils/userUtils';
import { storage } from '../firebase';
import { useState } from 'react';

export function useUpdateUserData(
  userId: string,
  nickname: string,
  profilePhoto: File | null
) {
  const navigate = useNavigate();
  const [isLoading, setLoading] = useState<boolean>(false);

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

      navigate('/account');
    } catch (error) {
      console.error('Error updating account information:', error);
    } finally {
      setLoading(false);
    }
  };

  return { onSubmit, isLoading };
}
