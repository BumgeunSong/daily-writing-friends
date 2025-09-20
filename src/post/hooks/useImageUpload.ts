import * as Sentry from '@sentry/react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useFileProcessor } from './useFileProcessor';
import { useUploadQueue } from './useUploadQueue';
import { uploadFilesBatch } from '../api/imageUpload';
import { UPLOAD_MESSAGES } from '../constants/upload';

interface UseImageUploadProps {
  insertImage: (url: string) => void;
}

export function useImageUpload({ insertImage }: UseImageUploadProps) {
  const { processFiles, validateFileCount } = useFileProcessor();
  const { state, startUpload, updateProgress, completeUpload, reset } = useUploadQueue();

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Validate file count
    const validation = validateFileCount(files.length);
    if (!validation.isValid) {
      return { error: validation.message };
    }

    try {
      // Process files
      const { processed, errors } = await processFiles(files);

      if (processed.length === 0) {
        toast.error('처리할 수 있는 파일이 없습니다');
        return { error: '처리할 수 있는 파일이 없습니다' };
      }

      // Start upload
      startUpload(processed);

      const { successes, errors: uploadErrors } = await uploadFilesBatch(
        processed.map(p => p.file),
        updateProgress
      );

      // Insert successful uploads
      successes.forEach(result => {
        insertImage(result.url);
      });

      // Complete upload
      const allErrors = [...errors, ...uploadErrors];
      completeUpload(successes, allErrors);

      // Show notifications
      if (successes.length > 0 && allErrors.length === 0) {
        toast.success(UPLOAD_MESSAGES.UPLOAD_SUCCESS(successes.length), {
          position: 'bottom-center',
        });
      } else if (successes.length > 0 && allErrors.length > 0) {
        toast.warning(UPLOAD_MESSAGES.UPLOAD_PARTIAL(successes.length, allErrors.length), {
          position: 'bottom-center',
        });
      } else if (allErrors.length > 0) {
        toast.error(UPLOAD_MESSAGES.UPLOAD_FAILED, {
          position: 'bottom-center',
        });
      }

      return { success: true };

    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: 'image_upload', operation: 'upload_process' },
        extra: { fileCount: files.length },
      });

      toast.error('업로드 중 오류가 발생했습니다', {
        position: 'bottom-center',
      });

      return { error: '업로드 중 오류가 발생했습니다' };
    }
  }, [processFiles, validateFileCount, startUpload, updateProgress, completeUpload, insertImage]);

  const isUploading = state.type === 'uploading';
  const uploadProgress = state.type === 'uploading' ? state.progress : null;
  const uploadComplete = state.type === 'complete' ? state.results : null;

  return {
    handleFileUpload,
    isUploading,
    uploadProgress,
    uploadComplete,
    reset,
  };
}