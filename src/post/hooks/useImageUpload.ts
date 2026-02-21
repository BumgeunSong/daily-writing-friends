import * as Sentry from '@sentry/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { storage } from '@/firebase';
import { processImageForUpload } from '@/post/utils/ImageUtils';

interface UseImageUploadProps {
    insertImage: (url: string) => void;
}

export function useImageUpload({ insertImage }: UseImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const isUploadingRef = useRef(false);

  const imageHandler = useCallback(async () => {
    if (isUploadingRef.current) return;
    isUploadingRef.current = true;

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        isUploadingRef.current = false;
        return;
      }

      // File size check (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("파일 크기는 5MB를 초과할 수 없습니다.", {
          position: 'bottom-center',
        });
        isUploadingRef.current = false;
        return;
      }

      // File type check (allow HEIC by extension)
      const isHeicByExtension = /\.(heic|heif)$/i.test(file.name);
      if (!file.type.startsWith('image/') && !isHeicByExtension) {
        toast.error("이미지 파일만 업로드할 수 있습니다.", {
          position: 'bottom-center',
        });
        isUploadingRef.current = false;
        return;
      }

      setIsUploading(true);

      // Blur keyboard on mobile
      (document.activeElement as HTMLElement)?.blur?.();

      let toastId: string | number | undefined;

      try {
        toastId = toast.loading("이미지 업로드 중...", {
          position: 'bottom-center',
          duration: Infinity,
        });

        // Process image (HEIC conversion + resize)
        const processedFile = await processImageForUpload(file);

        // Generate storage path
        const now = new Date();
        const { dateFolder, timePrefix } = formatDate(now);
        const fileName = `${timePrefix}_${processedFile.name}`;
        const storageRef = ref(storage, `postImages/${dateFolder}/${fileName}`);

        // Upload file
        const snapshot = await uploadBytes(storageRef, processedFile);

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Insert image into editor
        insertImage(downloadURL);

        toast.success("이미지가 업로드되었습니다.", {
          id: toastId,
          position: 'bottom-center',
          duration: 2000,
        });

      } catch (error) {
        Sentry.captureException(error, {
          tags: { feature: 'image_upload', operation: 'upload_process' },
          extra: { fileName: file?.name, fileSize: file?.size, fileType: file?.type }
        });
        toast.error("이미지 업로드에 실패했습니다.", {
          ...(toastId !== undefined && { id: toastId }),
          position: 'bottom-center',
        });
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          isUploadingRef.current = false;
        }, 500);
      }
    };
  }, [insertImage]);

  return { imageHandler, isUploading };
}


const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return {
      dateFolder: `${year}${month}${day}`,
      timePrefix: `${hours}${minutes}${seconds}`
    };
  };
