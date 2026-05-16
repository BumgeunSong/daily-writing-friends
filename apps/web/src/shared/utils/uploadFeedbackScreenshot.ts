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
import {
  captureProcessingFailure,
  HEIC_FAILURE_MESSAGE,
} from '@/post/utils/imageUploadTelemetry';
import { sanitizeStorageFileName } from '@/post/utils/storageFileName';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload feedback screenshot to Firebase Storage.
 * Compresses on the client first so users can submit large iPhone HEIC photos.
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

    if (processed.wasHeic && processed.heicConversionFailed) {
      return { success: false, error: HEIC_FAILURE_MESSAGE };
    }

    const processedSizeResult = validateProcessedFileSize(processed.file);
    if (!processedSizeResult.valid) {
      return { success: false, error: getValidationMessage(processedSizeResult.reason) };
    }

    const fileName = buildFeedbackScreenshotPath(processed.file.name);
    const storageRef = ref(storage, fileName);

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

const buildFeedbackScreenshotPath = (fileName: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const dateFolder = `${year}${month}${day}`;
  const timePrefix = `${hours}${minutes}${seconds}`;
  return `feedbackScreenshots/${dateFolder}/${timePrefix}_${sanitizeStorageFileName(fileName)}`;
};
