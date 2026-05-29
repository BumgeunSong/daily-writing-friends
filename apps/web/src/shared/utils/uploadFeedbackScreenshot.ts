import * as Sentry from '@sentry/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase';
import { processImageForUpload } from '@/post/utils/ImageUtils';
import {
  validateFileSize,
  validateProcessedFileSize,
  validateFileType,
  getValidationMessage,
} from '@/post/utils/ImageValidation';
import { captureProcessingFailure } from '@/post/utils/imageUploadTelemetry';
import { buildImageStoragePath } from '@/post/utils/storagePath';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload feedback screenshot to Firebase Storage.
 * Compresses on the client first to stay under the 5MB processed-size cap.
 */
export async function uploadFeedbackScreenshot(file: File): Promise<UploadResult> {
  if (!storage) {
    return { success: false, error: '스토리지에 연결할 수 없습니다.' };
  }

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

    const processedSizeResult = validateProcessedFileSize(processed.file);
    if (!processedSizeResult.valid) {
      return { success: false, error: getValidationMessage(processedSizeResult.reason) };
    }

    const storagePath = buildImageStoragePath(
      'feedbackScreenshots',
      processed.file.name,
      new Date(),
    );
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, processed.file, {
      contentType: processed.file.type || 'image/jpeg',
    });
    const downloadURL = await getDownloadURL(snapshot.ref);

    return { success: true, url: downloadURL };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: 'feedback_screenshot', operation: 'upload_process' },
      extra: { fileName: file?.name, fileSize: file?.size, fileType: file?.type },
    });
    return { success: false, error: '스크린샷 업로드에 실패했습니다.' };
  }
}

