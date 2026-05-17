import * as Sentry from '@sentry/react';
import { useState } from 'react';
import { AvatarUploadError } from '@/shared/errors/avatarUpload';
import { uploadUserProfilePhoto } from '@/user/api/user';

// Loading copy + error messages live here (UI layer), not in the resize utility.
const AVATAR_ERROR_MESSAGES: Record<string, string> = {
  'error.avatar.tooLarge': '20MB 이하의 사진을 사용해주세요',
  'error.avatar.unsupported': 'JPEG 또는 PNG 형식의 사진을 사용해주세요',
};

const GENERIC_ERROR_MESSAGE = '프로필 사진 업로드 중 문제가 발생했습니다.';

interface UseProfilePhotoArgs {
  userId: string | null;
  initialUrl: string | null;
}

export function useProfilePhoto({ userId, initialUrl }: UseProfilePhotoArgs) {
  const [uploadedPhotoURL, setUploadedPhotoURL] = useState<string | null>(null);
  const [previewURL, setPreviewURL] = useState(initialUrl || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Reset the input so re-selecting the same file fires onChange again.
    e.target.value = '';

    setAvatarError(null);
    setPreviewURL(URL.createObjectURL(file));
    setIsUploadingAvatar(true);

    try {
      const url = await uploadUserProfilePhoto(userId, file);
      setUploadedPhotoURL(url);
      setPreviewURL(url);
    } catch (err) {
      if (err instanceof AvatarUploadError) {
        setAvatarError(AVATAR_ERROR_MESSAGES[err.messageKey] ?? GENERIC_ERROR_MESSAGE);
      } else {
        setAvatarError(GENERIC_ERROR_MESSAGE);
        Sentry.captureException(err);
      }
      setPreviewURL(initialUrl || '');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return {
    uploadedPhotoURL,
    currentProfilePhotoURL: previewURL,
    handleProfilePhotoChange,
    isUploadingAvatar,
    avatarError,
  };
}
