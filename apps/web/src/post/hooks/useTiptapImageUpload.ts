import * as Sentry from '@sentry/react';
import { ref } from 'firebase/storage';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { storage } from '@/firebase';
import { processImageForUpload, type ProcessingStage } from '@/post/utils/ImageUtils';
import {
  validateFileSize,
  validateProcessedFileSize,
  validateFileType,
  getValidationMessage,
} from '@/post/utils/ImageValidation';
import { formatDate } from '@/post/utils/sanitizeHtml';
import { sanitizeStorageFileName } from '@/post/utils/storageFileName';
import { uploadFileWithProgress } from '@/post/utils/uploadWithProgress';
import type { Editor } from '@tiptap/react';

type UploadStage = 'idle' | ProcessingStage | 'uploading';

const STAGE_RESET_DELAY_MS = 500;

interface UseTiptapImageUploadProps {
  editor: Editor | null;
}

export function useTiptapImageUpload({ editor }: UseTiptapImageUploadProps) {
  const [stage, setStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    if (!storage) {
      throw new Error('스토리지에 연결할 수 없습니다.');
    }

    const typeResult = validateFileType(file);
    if (!typeResult.valid) {
      logValidationRejection(typeResult.reason, file.size, false);
      throw new Error(getValidationMessage(typeResult.reason));
    }

    const rawSizeResult = validateFileSize(file);
    if (!rawSizeResult.valid) {
      logValidationRejection(rawSizeResult.reason, file.size, false);
      throw new Error(getValidationMessage(rawSizeResult.reason));
    }

    const processed = await processImageForUpload(file, { onStage: setStage });

    const processedResult = validateProcessedFileSize(processed.file);
    if (!processedResult.valid) {
      logValidationRejection(
        processedResult.reason,
        processed.rawSize,
        processed.wasHeic,
        processed.processedSize,
      );
      throw new Error(getValidationMessage(processedResult.reason));
    }

    setStage('uploading');
    setUploadProgress(0);

    const now = new Date();
    const { dateFolder, timePrefix } = formatDate(now);
    const fileName = `${timePrefix}_${sanitizeStorageFileName(processed.file.name)}`;
    const storageRef = ref(storage, `postImages/${dateFolder}/${fileName}`);

    const downloadURL = await uploadFileWithProgress(storageRef, processed.file, {
      metadata: { contentType: processed.file.type || 'image/jpeg' },
      onProgress: setUploadProgress,
    });

    logUploadSuccess(processed);

    return downloadURL;
  }, []);

  const resetStageAfterDelay = useCallback(() => {
    setTimeout(() => {
      setStage('idle');
      setUploadProgress(0);
    }, STAGE_RESET_DELAY_MS);
  }, []);

  const insertImageIntoEditor = useCallback(
    (downloadURL: string, alt: string) => {
      if (!editor) return;
      editor.chain().focus().setImage({ src: downloadURL, alt }).run();
    },
    [editor],
  );

  const openFilePicker = useCallback(async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const downloadURL = await uploadFile(file);
        insertImageIntoEditor(downloadURL, file.name);
        toast.success('이미지가 업로드되었습니다.', { position: 'bottom-center' });
      } catch (error) {
        handleUploadError(error, 'file_picker', file);
      } finally {
        resetStageAfterDelay();
      }
    };
  }, [insertImageIntoEditor, resetStageAfterDelay, uploadFile]);

  const handlePaste = useCallback(
    async (event: ClipboardEvent): Promise<boolean> => {
      const items = event.clipboardData?.items;
      if (!items) return false;

      for (const item of Array.from(items)) {
        if (!item.type.startsWith('image/')) continue;
        event.preventDefault();
        event.stopPropagation();

        const file = item.getAsFile();
        if (!file) continue;

        try {
          const downloadURL = await uploadFile(file);
          insertImageIntoEditor(downloadURL, 'Pasted image');
          toast.success('이미지가 업로드되었습니다.', { position: 'bottom-center' });
          return true;
        } catch (error) {
          handleUploadError(error, 'paste_upload', file);
        } finally {
          resetStageAfterDelay();
        }
      }

      return false;
    },
    [insertImageIntoEditor, resetStageAfterDelay, uploadFile],
  );

  const handleDrop = useCallback(
    async (event: DragEvent): Promise<boolean> => {
      const items = event.dataTransfer?.items;
      if (!items) return false;

      for (const item of Array.from(items)) {
        if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
        event.preventDefault();
        event.stopPropagation();

        const file = item.getAsFile();
        if (!file) continue;

        try {
          const downloadURL = await uploadFile(file);
          insertImageIntoEditor(downloadURL, file.name);
          toast.success('이미지가 업로드되었습니다.', { position: 'bottom-center' });
          return true;
        } catch (error) {
          handleUploadError(error, 'drop_upload', file);
        } finally {
          resetStageAfterDelay();
        }
      }

      return false;
    },
    [insertImageIntoEditor, resetStageAfterDelay, uploadFile],
  );

  return {
    openFilePicker,
    uploadFile,
    handlePaste,
    handleDrop,
    isUploading: stage !== 'idle',
    stage,
    uploadProgress,
  };
}

const handleUploadError = (error: unknown, operation: string, file: File) => {
  const errorMessage =
    error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.';

  Sentry.captureException(error, {
    tags: { feature: 'image_upload', operation },
    extra: { fileName: file?.name, fileSize: file?.size, fileType: file?.type },
  });

  toast.error(errorMessage, { position: 'bottom-center' });
};

const logValidationRejection = (
  reason: string,
  rawSize: number,
  wasHeic: boolean,
  processedSize?: number,
) => {
  Sentry.addBreadcrumb({
    category: 'image_upload',
    message: 'validation_reject',
    level: 'warning',
    data: { reason, raw_size: rawSize, processed_size: processedSize, was_heic: wasHeic },
  });
};

const logUploadSuccess = (processed: {
  rawSize: number;
  processedSize: number;
  wasHeic: boolean;
  didResize: boolean;
}) => {
  const compressionRatio =
    processed.rawSize > 0 ? processed.processedSize / processed.rawSize : 1;
  Sentry.addBreadcrumb({
    category: 'image_upload',
    message: 'upload_success',
    level: 'info',
    data: {
      raw_size: processed.rawSize,
      processed_size: processed.processedSize,
      compression_ratio: Number(compressionRatio.toFixed(3)),
      was_heic: processed.wasHeic,
      did_resize: processed.didResize,
    },
  });
};
