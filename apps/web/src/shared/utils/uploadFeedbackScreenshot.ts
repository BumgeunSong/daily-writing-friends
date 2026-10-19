import * as Sentry from '@sentry/react';
import { getCurrentUserId, uploadImage } from '@/shared/external/imageStorage';
import { processImageForUpload } from '@/post/utils/ImageUtils';
import {
  validateFileSize,
  validateProcessedFileSize,
  validateFileType,
  getValidationMessage,
} from '@/post/utils/ImageValidation';
import { captureProcessingFailure } from '@/post/utils/imageUploadTelemetry';
import { buildImageStoragePath, resolveImageContentType } from '@/post/utils/storagePath';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload feedback screenshot to Supabase Storage.
 * Compresses on the client first to stay under the 5MB processed-size cap.
 */
export async function uploadFeedbackScreenshot(file: File): Promise<UploadResult> {
  const typeResult = validateFileType(file);
  if (!typeResult.valid) {
    return { success: false, error: getValidationMessage(typeResult.reason) };
  }

  const rawSizeResult = validateFileSize(file);
  if (!rawSizeResult.valid) {
    return { success: false, error: getValidationMessage(rawSizeResult.reason) };
  }

  try {
    const processed = await processImageForUpload(file, {
      onError: captureProcessingFailure,
    });

    if (processed.resizeFailed) {
      return { success: false, error: '이미지를 처리할 수 없습니다. 다른 사진으로 다시 시도해주세요.' };
    }

    const processedSizeResult = validateProcessedFileSize(processed.file);
    if (!processedSizeResult.valid) {
      return { success: false, error: getValidationMessage(processedSizeResult.reason) };
    }

    const uid = await getCurrentUserId();
    const downloadURL = await uploadImage({
      bucket: 'feedback-screenshots',
      path: buildImageStoragePath(uid, processed.file, new Date(), crypto.randomUUID()),
      file: processed.file,
      contentType: resolveImageContentType(processed.file),
    });

    return { success: true, url: downloadURL };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: 'feedback_screenshot', operation: 'upload_process' },
      extra: { fileName: file?.name, fileSize: file?.size, fileType: file?.type },
    });
    return { success: false, error: '스크린샷 업로드에 실패했습니다.' };
  }
}

