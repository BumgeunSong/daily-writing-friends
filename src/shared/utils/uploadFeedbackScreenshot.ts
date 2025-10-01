import * as Sentry from '@sentry/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import heic2any from 'heic2any';
import { storage } from '@/firebase';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload feedback screenshot to Firebase Storage
 */
export async function uploadFeedbackScreenshot(file: File): Promise<UploadResult> {
  try {
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return {
        success: false,
        error: '파일 크기는 5MB를 초과할 수 없습니다.',
      };
    }

    let processedFile = file;

    // Convert HEIC files to JPEG
    const isHeicFile =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif');

    if (isHeicFile) {
      try {
        const convertedBlob = (await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8,
        })) as Blob;

        const convertedFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        processedFile = new File([convertedBlob], convertedFileName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      } catch (conversionError) {
        Sentry.captureException(conversionError, {
          tags: { feature: 'feedback_screenshot', operation: 'heic_conversion' },
          extra: { fileName: file.name, fileSize: file.size, fileType: file.type },
        });
        return {
          success: false,
          error: 'HEIC 파일 변환에 실패했습니다.',
        };
      }
    }

    // Validate file type
    if (!processedFile.type.startsWith('image/')) {
      return {
        success: false,
        error: '이미지 파일만 업로드할 수 있습니다.',
      };
    }

    // Create date-based file path
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const dateFolder = `${year}${month}${day}`;
    const timePrefix = `${hours}${minutes}${seconds}`;
    const fileName = `${timePrefix}_${processedFile.name}`;
    const storageRef = ref(storage, `feedbackScreenshots/${dateFolder}/${fileName}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, processedFile);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      url: downloadURL,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: 'feedback_screenshot', operation: 'upload_process' },
      extra: { fileName: file?.name, fileSize: file?.size, fileType: file?.type },
    });
    return {
      success: false,
      error: '스크린샷 업로드에 실패했습니다.',
    };
  }
}
