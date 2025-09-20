import { useState, useCallback } from 'react';
import { useFileProcessor } from './useFileProcessor';
import { useImageUpload } from './useImageUpload';
import { UPLOAD_LIMITS } from '../constants/upload';

interface UseImageUploadDialogProps {
  insertImage: (url: string) => void;
}

export function useImageUploadDialog({ insertImage }: UseImageUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [maxFilesAlert, setMaxFilesAlert] = useState<{
    show: boolean;
    fileCount: number;
    files?: File[];
  }>({
    show: false,
    fileCount: 0,
  });

  const { validateFileCount } = useFileProcessor();
  const imageUpload = useImageUpload({ insertImage });

  const openDialog = useCallback(() => {
    setIsOpen(true);
    imageUpload.reset();
  }, [imageUpload]);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setMaxFilesAlert({ show: false, fileCount: 0 });
    imageUpload.reset();
  }, [imageUpload]);

  const selectFiles = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.setAttribute('multiple', 'true');
    input.click();

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) return;

      // Check file count limit
      const validation = validateFileCount(files.length);
      if (!validation.isValid) {
        setMaxFilesAlert({
          show: true,
          fileCount: files.length,
          files,
        });
        return;
      }

      // Upload files
      await imageUpload.handleFileUpload(files);
    };
  }, [validateFileCount, imageUpload]);

  const handleMaxFilesConfirm = useCallback(async () => {
    if (!maxFilesAlert.files) return;

    const first10Files = maxFilesAlert.files.slice(0, UPLOAD_LIMITS.MAX_FILES);
    setMaxFilesAlert({ show: false, fileCount: 0 });
    await imageUpload.handleFileUpload(first10Files);
  }, [maxFilesAlert.files, imageUpload]);

  const handleMaxFilesCancel = useCallback(() => {
    setMaxFilesAlert({ show: false, fileCount: 0 });
    selectFiles();
  }, [selectFiles]);

  return {
    // Dialog state
    isOpen,
    openDialog,
    closeDialog,

    // File selection
    selectFiles,

    // Max files alert
    maxFilesAlert,
    handleMaxFilesConfirm,
    handleMaxFilesCancel,

    // Upload state
    isUploading: imageUpload.isUploading,
    uploadProgress: imageUpload.uploadProgress,
    uploadComplete: imageUpload.uploadComplete,
  };
}