import * as Sentry from '@sentry/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { storage } from '@/firebase';
import { processImageForUpload } from '@/post/utils/ImageUtils';
import {
  validateFileSize,
  validateProcessedFileSize,
  validateFileType,
  aggregateResults,
  getValidationMessage,
} from '@/post/utils/ImageValidation';
import {
  captureProcessingFailure,
  HEIC_FAILURE_MESSAGE,
} from '@/post/utils/imageUploadTelemetry';
import { sanitizeStorageFileName } from '@/post/utils/storageFileName';

interface UseImageUploadProps {
  insertImage: (url: string, index?: number) => void;
  editorRoot: HTMLElement | null;
  getCursorIndex?: () => number | undefined;
}

export function useImageUpload({ insertImage, editorRoot, getCursorIndex }: UseImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const isUploadingRef = useRef(false);
  const dragCounterRef = useRef(0);

  const uploadAndInsertFile = useCallback(
    async (file: File, insertIndex?: number): Promise<boolean> => {
      if (!storage) {
        toast.error('스토리지에 연결할 수 없습니다.', { position: 'bottom-center' });
        return false;
      }

      const typeResult = validateFileType(file);
      if (!typeResult.valid) {
        logValidationRejection(typeResult.reason, file.size, false);
        toast.error(getValidationMessage(typeResult.reason), { position: 'bottom-center' });
        return false;
      }

      const sizeResult = validateFileSize(file);
      if (!sizeResult.valid) {
        logValidationRejection(sizeResult.reason, file.size, false);
        toast.error(getValidationMessage(sizeResult.reason), { position: 'bottom-center' });
        return false;
      }

      const processed = await processImageForUpload(file, {
        onError: captureProcessingFailure,
      });

      if (processed.wasHeic && processed.heicConversionFailed) {
        toast.error(HEIC_FAILURE_MESSAGE, { position: 'bottom-center' });
        return false;
      }

      const processedSizeResult = validateProcessedFileSize(processed.file);
      if (!processedSizeResult.valid) {
        logValidationRejection(
          processedSizeResult.reason,
          processed.rawSize,
          processed.wasHeic,
          processed.processedSize,
        );
        toast.error(getValidationMessage(processedSizeResult.reason), {
          position: 'bottom-center',
        });
        return false;
      }

      const now = new Date();
      const { dateFolder, timePrefix } = formatDate(now);
      const fileName = `${timePrefix}_${sanitizeStorageFileName(processed.file.name)}`;
      const storageRef = ref(storage, `postImages/${dateFolder}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, processed.file, {
        contentType: processed.file.type || 'image/jpeg',
      });
      const downloadURL = await getDownloadURL(snapshot.ref);

      logUploadSuccess(processed);

      insertImage(downloadURL, insertIndex);
      return true;
    },
    [insertImage],
  );

  const processFiles = useCallback(
    async (files: File[], cursorIndex?: number) => {
      if (files.length === 0) return;
      if (isUploadingRef.current) return;

      isUploadingRef.current = true;
      setIsUploading(true);

      // Blur keyboard on mobile
      (document.activeElement as HTMLElement)?.blur?.();

      const isSingle = files.length === 1;
      const toastId = toast.loading(
        isSingle ? '이미지 업로드 중...' : `이미지 업로드 중... (1/${files.length})`,
        { position: 'bottom-center', duration: Infinity },
      );

      const results: Array<{ success: boolean }> = [];
      let insertOffset = 0;

      for (let i = 0; i < files.length; i++) {
        if (!isSingle) {
          toast.loading(`이미지 업로드 중... (${i + 1}/${files.length})`, {
            id: toastId,
            position: 'bottom-center',
            duration: Infinity,
          });
        }

        try {
          const insertIndex =
            cursorIndex !== undefined ? cursorIndex + insertOffset : undefined;
          const success = await uploadAndInsertFile(files[i], insertIndex);
          results.push({ success });
          if (success) insertOffset++;
        } catch (error) {
          Sentry.captureException(error, {
            tags: { feature: 'image_upload', operation: 'upload_process' },
            extra: {
              fileName: files[i]?.name,
              fileSize: files[i]?.size,
              fileType: files[i]?.type,
              batchIndex: i,
              batchTotal: files.length,
            },
          });
          results.push({ success: false });
        }
      }

      // Show summary toast
      const { succeeded, failed } = aggregateResults(results);
      if (failed === 0) {
        toast.success(
          isSingle ? '이미지가 업로드되었습니다.' : `${succeeded}장 업로드 완료`,
          { id: toastId, position: 'bottom-center', duration: 2000 },
        );
      } else if (succeeded === 0) {
        toast.error('이미지 업로드에 실패했습니다.', {
          id: toastId,
          position: 'bottom-center',
        });
      } else {
        toast.warning(`${succeeded}장 업로드 완료, ${failed}장 실패`, {
          id: toastId,
          position: 'bottom-center',
        });
      }

      isUploadingRef.current = false;
      setIsUploading(false);
    },
    [uploadAndInsertFile],
  );

  // Toolbar image button handler (multi-file capable)
  // Use isUploadingRef (not isUploading state) to keep callback reference stable.
  // Changing imageHandler ref cascades: toolbarImageHandler → modules → Quill reinit.
  const imageHandler = useCallback(
    async (cursorIndex?: number) => {
      if (isUploadingRef.current) return;

      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'image/*');
      input.setAttribute('multiple', 'true');
      input.click();

      input.onchange = async () => {
        const files = Array.from(input.files ?? []);
        if (files.length === 0) return;
        await processFiles(files, cursorIndex);
      };
    },
    [processFiles],
  );

  // Drop handler
  useEffect(() => {
    if (!editorRoot) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) {
        setIsDragOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDragOver(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer?.files ?? []);
      const imageFiles = files.filter(
        (f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name),
      );

      if (files.length > 0 && imageFiles.length === 0) {
        toast.error('이미지 파일만 업로드할 수 있습니다.', { position: 'bottom-center' });
        return;
      }

      if (imageFiles.length > 0) {
        const cursorIndex = getCursorIndex?.();
        await processFiles(imageFiles, cursorIndex);
      }
    };

    editorRoot.addEventListener('dragenter', handleDragEnter);
    editorRoot.addEventListener('dragleave', handleDragLeave);
    editorRoot.addEventListener('dragover', handleDragOver);
    editorRoot.addEventListener('drop', handleDrop);

    return () => {
      editorRoot.removeEventListener('dragenter', handleDragEnter);
      editorRoot.removeEventListener('dragleave', handleDragLeave);
      editorRoot.removeEventListener('dragover', handleDragOver);
      editorRoot.removeEventListener('drop', handleDrop);
      dragCounterRef.current = 0;
    };
  }, [editorRoot, processFiles, getCursorIndex]);

  // Paste handler — capture phase so it runs BEFORE Quill's handler
  // prevents Quill from inserting a base64 image before our upload starts
  useEffect(() => {
    if (!editorRoot) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const cursorIndex = getCursorIndex?.();
        await processFiles(imageFiles, cursorIndex);
      }
    };

    editorRoot.addEventListener('paste', handlePaste, true);
    return () => {
      editorRoot.removeEventListener('paste', handlePaste, true);
    };
  }, [editorRoot, processFiles, getCursorIndex]);

  return { imageHandler, isUploading, isDragOver };
}

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
  heicConversionFailed: boolean;
  resizeFailed: boolean;
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
      heic_conversion_failed: processed.heicConversionFailed,
      resize_failed: processed.resizeFailed,
    },
  });
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return {
    dateFolder: `${year}${month}${day}`,
    timePrefix: `${hours}${minutes}${seconds}`,
  };
};
