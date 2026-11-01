import * as Sentry from '@sentry/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getCurrentUserId, uploadImage } from '@/shared/external/imageStorage';
import { processImageForUpload, type ProcessingStage } from '@/post/utils/ImageUtils';
import {
  validateFileSize,
  validateProcessedFileSize,
  validateFileType,
  getValidationMessage,
  SUPPORTED_ACCEPT_ATTRIBUTE,
  aggregateResults,
} from '@/post/utils/ImageValidation';
import { planFileTransfer } from '@/post/utils/fileTransferPlan';
import { captureProcessingFailure } from '@/post/utils/imageUploadTelemetry';
import { buildImageStoragePath, resolveImageContentType } from '@/post/utils/storagePath';
import type { Editor } from '@tiptap/react';

type UploadStage = 'idle' | ProcessingStage | 'uploading';

const STAGE_RESET_DELAY_MS = 500;
const UPLOAD_IN_PROGRESS_MESSAGE = '이미 업로드가 진행 중입니다. 잠시 후 다시 시도해주세요.';

interface UseTiptapImageUploadProps {
  editor: Editor | null;
}

export function useTiptapImageUpload({ editor }: UseTiptapImageUploadProps) {
  const [stage, setStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const isUploadingRef = useRef(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    };
  }, []);

  // Schedules an idle reset only on behalf of the call that actually owned the upload.
  // Kept out of the entry-point catch blocks so a synchronous "already in progress" guard
  // throw from a second caller never clobbers the first upload's stage mid-flight.
  const scheduleStageReset = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(() => {
      setStage('idle');
      setUploadProgress(0);
      resetTimeoutRef.current = null;
    }, STAGE_RESET_DELAY_MS);
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    if (isUploadingRef.current) {
      throw new Error(UPLOAD_IN_PROGRESS_MESSAGE);
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    isUploadingRef.current = true;

    try {
      const typeResult = validateFileType(file);
      if (!typeResult.valid) {
        logValidationRejection(typeResult.reason, file.size);
        throw new Error(getValidationMessage(typeResult.reason));
      }

      const rawSizeResult = validateFileSize(file);
      if (!rawSizeResult.valid) {
        logValidationRejection(rawSizeResult.reason, file.size);
        throw new Error(getValidationMessage(rawSizeResult.reason));
      }

      const processed = await processImageForUpload(file, {
        onStage: setStage,
        onError: captureProcessingFailure,
      });

      // Decode/canvas failure leaves processed.file as the original undecodable bytes.
      // Upload would succeed but the post would render a broken <img>, so fail fast.
      if (processed.resizeFailed) {
        throw new Error('이미지를 처리할 수 없습니다. 다른 사진으로 다시 시도해주세요.');
      }

      const processedResult = validateProcessedFileSize(processed.file);
      if (!processedResult.valid) {
        logValidationRejection(
          processedResult.reason,
          processed.rawSize,
          processed.processedSize,
        );
        throw new Error(getValidationMessage(processedResult.reason));
      }

      setStage('uploading');
      setUploadProgress(0);

      const uid = await getCurrentUserId();
      const downloadURL = await uploadImage({
        bucket: 'post-images',
        path: buildImageStoragePath(uid, processed.file, new Date(), crypto.randomUUID()),
        file: processed.file,
        contentType: resolveImageContentType(processed.file),
      });
      setUploadProgress(100);

      logUploadSuccess(processed);
      return downloadURL;
    } finally {
      isUploadingRef.current = false;
      scheduleStageReset();
    }
  }, [scheduleStageReset]);

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
    input.setAttribute('accept', SUPPORTED_ACCEPT_ATTRIBUTE);
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
      }
    };
  }, [insertImageIntoEditor, uploadFile]);

  // Shell: claims the event, uploads the planned files one by one, reports the outcome.
  // The decision of *what* to take lives in planFileTransfer (pure, unit-tested).
  const handleFileTransfer = useCallback(
    async (
      event: Event,
      items: DataTransferItemList | undefined,
      source: { operation: string; altFor: (file: File) => string },
    ): Promise<boolean> => {
      if (!items) return false;

      // Must read files synchronously: the item list is invalidated once we `await`.
      const plan = planFileTransfer(
        Array.from(items, (item) => ({ kind: item.kind, file: item.getAsFile() })),
      );
      if (!plan.shouldClaimEvent) return false;

      event.preventDefault();
      event.stopPropagation();

      // Sequential on purpose: uploadFile rejects concurrent calls.
      const outcomes: Array<{ success: boolean }> = [];
      for (const file of plan.files) {
        try {
          const downloadURL = await uploadFile(file);
          insertImageIntoEditor(downloadURL, source.altFor(file));
          outcomes.push({ success: true });
        } catch (error) {
          handleUploadError(error, source.operation, file);
          outcomes.push({ success: false });
        }
      }

      const { succeeded } = aggregateResults(outcomes);
      if (succeeded > 0) {
        toast.success(
          succeeded === 1
            ? '이미지가 업로드되었습니다.'
            : `이미지 ${succeeded}장이 업로드되었습니다.`,
          { position: 'bottom-center' },
        );
      }
      return true;
    },
    [insertImageIntoEditor, uploadFile],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent) =>
      handleFileTransfer(event, event.clipboardData?.items, {
        operation: 'paste_upload',
        altFor: () => 'Pasted image',
      }),
    [handleFileTransfer],
  );

  const handleDrop = useCallback(
    (event: DragEvent) =>
      handleFileTransfer(event, event.dataTransfer?.items, {
        operation: 'drop_upload',
        altFor: (file) => file.name,
      }),
    [handleFileTransfer],
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
  processedSize?: number,
) => {
  Sentry.addBreadcrumb({
    category: 'image_upload',
    message: 'validation_reject',
    level: 'warning',
    data: { reason, raw_size: rawSize, processed_size: processedSize },
  });
};

const logUploadSuccess = (processed: {
  rawSize: number;
  processedSize: number;
  didResize: boolean;
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
      did_resize: processed.didResize,
      resize_failed: processed.resizeFailed,
    },
  });
};
