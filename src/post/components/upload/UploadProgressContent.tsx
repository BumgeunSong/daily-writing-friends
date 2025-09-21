import { DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Progress } from '@/shared/ui/progress';
import { UPLOAD_MESSAGES } from '../../constants/upload';
import type { UploadProgress } from '../../types/upload';

interface UploadProgressContentProps {
  uploadProgress: UploadProgress;
}

export function UploadProgressContent({ uploadProgress }: UploadProgressContentProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>업로드 중</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <Progress value={uploadProgress.percentage} className="h-2" />
        <p className="text-center text-sm text-muted-foreground">
          {UPLOAD_MESSAGES.UPLOADING(
            uploadProgress.current,
            uploadProgress.total,
            uploadProgress.currentFileName
          )}
        </p>
      </div>
    </>
  );
}