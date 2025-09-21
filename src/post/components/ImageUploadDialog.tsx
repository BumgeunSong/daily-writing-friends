import { useCallback } from 'react';
import { Dialog, DialogContent } from '@/shared/ui/dialog';

// Components
import { InitialUploadContent } from './upload/InitialUploadContent';
import { UploadProgressContent } from './upload/UploadProgressContent';
import { MaxFilesAlertContent } from './upload/MaxFilesAlertContent';
import { UploadCompleteContent } from './upload/UploadCompleteContent';

// Types
import type { ImageUploadDialogProps, DialogState } from '@/post/types/upload';

export function ImageUploadDialog({
  isOpen,
  onOpenChange,
  onSelectFiles,
  onClose,
  isUploading,
  uploadProgress,
  uploadComplete,
  maxFilesAlert,
  onMaxFilesConfirm,
  onMaxFilesCancel,
}: ImageUploadDialogProps) {
  const getDialogState = useCallback((): DialogState => {
    if (maxFilesAlert.show) return 'maxFiles';
    if (uploadComplete) return 'complete';
    if (isUploading && uploadProgress) return 'uploading';
    return 'initial';
  }, [maxFilesAlert.show, uploadComplete, isUploading, uploadProgress]);

  const handleClose = useCallback(() => {
    onClose();
    onOpenChange(false);
  }, [onClose, onOpenChange]);

  const dialogState = getDialogState();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {dialogState === 'initial' && <InitialUploadContent onSelectFiles={onSelectFiles} />}

        {dialogState === 'uploading' && uploadProgress && (
          <UploadProgressContent uploadProgress={uploadProgress} />
        )}

        {dialogState === 'maxFiles' && (
          <MaxFilesAlertContent
            maxFilesAlert={maxFilesAlert}
            onMaxFilesConfirm={onMaxFilesConfirm}
            onMaxFilesCancel={onMaxFilesCancel}
          />
        )}

        {dialogState === 'complete' && uploadComplete && (
          <UploadCompleteContent uploadComplete={uploadComplete} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}