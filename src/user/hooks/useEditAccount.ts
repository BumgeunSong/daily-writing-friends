import { useState, useEffect } from 'react';
import { useNickname } from '@/user/hooks/useNickName';
import { useProfilePhoto } from '@/user/hooks/useProfilePhoto';
import { useUser } from '@/user/hooks/useUser';

export function useEditAccount({ userId }: { userId: string | null }) {
  const { userData, isLoading: isLoadingUser } = useUser(userId ?? null);
  const { nickname, handleNicknameChange } = useNickname(userData?.nickname || '');
  const { profilePhotoFile, currentProfilePhotoURL, handleProfilePhotoChange } = useProfilePhoto(userData?.profilePhotoURL || null);
  const [bio, setBio] = useState(userData?.bio || '');

  useEffect(() => {
    setBio(userData?.bio || '');
  }, [userData?.bio]);

  return {
    userId,
    userData,
    nickname,
    handleNicknameChange,
    profilePhotoFile,
    currentProfilePhotoURL,
    handleProfilePhotoChange,
    bio,
    setBio,
    isLoadingUser
  };
} 