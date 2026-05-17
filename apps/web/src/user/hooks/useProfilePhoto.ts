import * as Sentry from '@sentry/react';
import { useEffect, useRef, useState } from 'react';
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
  // Track the currently-rendered object URL so we can revoke it when it's
  // replaced (next file pick / upload success / error revert) and on unmount.
  const objectUrlRef = useRef<string | null>(null);

  const swapPreview = (next: string) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (next.startsWith('blob:')) {
      objectUrlRef.current = next;
    }
    setPreviewURL(next);
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Reset the input so re-selecting the same file fires onChange again.
    e.target.value = '';

    // Clear any prior upload result so a failed retry can't submit a stale URL
    // even though the preview has been reverted (see PR #609 review).
    setUploadedPhotoURL(null);
    setAvatarError(null);
    swapPreview(URL.createObjectURL(file));
    setIsUploadingAvatar(true);

    try {
      const url = await uploadUserProfilePhoto(userId, file);
      setUploadedPhotoURL(url);
      swapPreview(url);
    } catch (err) {
      if (err instanceof AvatarUploadError) {
        setAvatarError(AVATAR_ERROR_MESSAGES[err.messageKey] ?? GENERIC_ERROR_MESSAGE);
      } else {
        setAvatarError(GENERIC_ERROR_MESSAGE);
        Sentry.captureException(err);
      }
      swapPreview(initialUrl || '');
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
