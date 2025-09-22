import { Upload } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Progress } from '@/shared/ui/progress';
import { UPLOAD_MESSAGES } from '../constants/upload';

interface ImageUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFiles: () => void;
  isUploading: boolean;
  uploadProgress: {
    current: number;
    total: number;
    percentage: number;
    currentFileName: string;
  } | null;
  uploadComplete: {
    success: number;
    failed: number;
    failedFiles: Array<{ name: string; error: string }>;
  } | null;
  maxFilesAlert: {
    show: boolean;
    fileCount: number;
  };
  onClose: () => void;
  onMaxFilesConfirm: () => void;
  onMaxFilesCancel: () => void;
}

type DialogState = 'initial' | 'uploading' | 'complete' | 'maxFiles';

export function ImageUploadDialog({
  isOpen,
  onOpenChange,
  onSelectFiles,
  isUploading,
  uploadProgress,
  uploadComplete,
  maxFilesAlert,
  onClose,
  onMaxFilesConfirm,
  onMaxFilesCancel,
}: ImageUploadDialogProps) {
  const getDialogState = (): DialogState => {
    if (maxFilesAlert.show) return 'maxFiles';
    if (uploadComplete) return 'complete';
    if (isUploading && uploadProgress) return 'uploading';
    return 'initial';
  };

  const dialogState = getDialogState();

  const handleClose = () => {
    onClose();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        {dialogState === 'initial' && (
          <>
            <DialogHeader>
              <DialogTitle>{UPLOAD_MESSAGES.DIALOG_TITLE}</DialogTitle>
              <DialogDescription>{UPLOAD_MESSAGES.DIALOG_DESCRIPTION}</DialogDescription>
            </DialogHeader>
            <div className='flex flex-col items-center justify-center py-6'>
              <Upload className='mb-4 size-8 text-muted-foreground' />
              <Button onClick={onSelectFiles} size='lg'>
                {UPLOAD_MESSAGES.DIALOG_BUTTON}
              </Button>
            </div>
          </>
        )}

        {dialogState === 'uploading' && uploadProgress && (
          <>
            <DialogHeader>
              <DialogTitle>업로드 중</DialogTitle>
            </DialogHeader>
            <div className='space-y-4 py-4'>
              <Progress value={uploadProgress.percentage} className='h-2' />
              <p className='text-center text-sm text-muted-foreground'>
                {UPLOAD_MESSAGES.UPLOADING(
                  uploadProgress.current,
                  uploadProgress.total,
                  uploadProgress.currentFileName
                )}
              </p>
            </div>
          </>
        )}

        {dialogState === 'maxFiles' && (
          <>
            <DialogHeader>
              <DialogTitle>파일 개수 초과</DialogTitle>
              <DialogDescription>
                {UPLOAD_MESSAGES.MAX_FILES_EXCEEDED(maxFilesAlert.fileCount)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className='gap-2 sm:gap-0'>
              <Button variant='outline' onClick={onMaxFilesCancel}>
                다시 선택
              </Button>
              <Button onClick={onMaxFilesConfirm}>처음 10개만 업로드</Button>
            </DialogFooter>
          </>
        )}

        {dialogState === 'complete' && uploadComplete && (
          <>
            <DialogHeader>
              <DialogTitle>업로드 완료</DialogTitle>
            </DialogHeader>
            <div className='space-y-4 py-4'>
              <p className='text-center'>
                {uploadComplete.success}개 업로드 완료
                {uploadComplete.failed > 0 && (
                  <span className='text-destructive'>, {uploadComplete.failed}개 실패</span>
                )}
              </p>

              {uploadComplete.failedFiles.length > 0 && (
                <div className='space-y-2'>
                  <p className='text-sm font-medium'>실패한 파일:</p>
                  <div className='max-h-32 space-y-1 overflow-y-auto'>
                    {uploadComplete.failedFiles.map((file, index) => (
                      <p key={index} className='text-xs text-muted-foreground'>
                        • {file.name}: {file.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>닫기</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
