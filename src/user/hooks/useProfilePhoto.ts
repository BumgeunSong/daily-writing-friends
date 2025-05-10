import { useState } from 'react';
import { cropAndResizeImage } from '@/post/utils/ImageUtils';

export function useProfilePhoto(initialUrl: string | null) {
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [currentProfilePhotoURL, setCurrentProfilePhotoURL] = useState(initialUrl || '');
  
  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      cropAndResizeImage(file, (resizedFile) => {
        setProfilePhotoFile(resizedFile);
        setCurrentProfilePhotoURL(URL.createObjectURL(resizedFile));
      });
    }
  };

  return { profilePhotoFile, currentProfilePhotoURL, handleProfilePhotoChange };
}
