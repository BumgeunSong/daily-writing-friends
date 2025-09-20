import * as Sentry from '@sentry/react';
import heic2any from 'heic2any';
import { UPLOAD_LIMITS, UPLOAD_MESSAGES } from '../constants/upload';

export interface ProcessedFile {
  file: File;
  originalName: string;
  id: string;
}

export interface FileProcessingError {
  fileName: string;
  error: string;
}

export function useFileProcessor() {
  const processFile = async (file: File): Promise<ProcessedFile> => {
    // Validate file size
    if (file.size > UPLOAD_LIMITS.MAX_FILE_SIZE) {
      throw new Error(UPLOAD_MESSAGES.FILE_SIZE_EXCEEDED);
    }

    let processedFile = file;

    // Handle HEIC conversion
    if (
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif')
    ) {
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8,
        }) as Blob;

        const convertedFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        processedFile = new File([convertedBlob], convertedFileName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      } catch (conversionError) {
        Sentry.captureException(conversionError, {
          tags: { feature: 'image_upload', operation: 'heic_conversion' },
          extra: { fileName: file.name, fileSize: file.size, fileType: file.type },
        });
        throw new Error(UPLOAD_MESSAGES.HEIC_CONVERSION_FAILED);
      }
    }

    // Validate file type
    if (!processedFile.type.startsWith('image/')) {
      throw new Error(UPLOAD_MESSAGES.INVALID_FILE_TYPE);
    }

    return {
      file: processedFile,
      originalName: file.name,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    };
  };

  const processFiles = async (files: File[]): Promise<{
    processed: ProcessedFile[];
    errors: FileProcessingError[];
  }> => {
    const processed: ProcessedFile[] = [];
    const errors: FileProcessingError[] = [];

    for (const file of files) {
      try {
        const processedFile = await processFile(file);
        processed.push(processedFile);
      } catch (error) {
        errors.push({
          fileName: file.name,
          error: error instanceof Error ? error.message : '처리 실패',
        });
      }
    }

    return { processed, errors };
  };

  const validateFileCount = (fileCount: number): {
    isValid: boolean;
    message?: string
  } => {
    if (fileCount > UPLOAD_LIMITS.MAX_FILES) {
      return {
        isValid: false,
        message: UPLOAD_MESSAGES.MAX_FILES_EXCEEDED(fileCount),
      };
    }
    return { isValid: true };
  };

  return {
    processFile,
    processFiles,
    validateFileCount,
  };
}