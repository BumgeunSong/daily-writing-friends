import { Button } from '@/shared/ui/button';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog';
import { UPLOAD_MESSAGES } from '../../constants/upload';
import type { MaxFilesAlert } from '../../types/upload';

interface MaxFilesAlertContentProps {
  maxFilesAlert: MaxFilesAlert;
  onMaxFilesConfirm: () => void;
  onMaxFilesCancel: () => void;
}

export function MaxFilesAlertContent({
  maxFilesAlert,
  onMaxFilesConfirm,
  onMaxFilesCancel,
}: MaxFilesAlertContentProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>파일 개수 초과</DialogTitle>
        <DialogDescription>
          {UPLOAD_MESSAGES.MAX_FILES_EXCEEDED(maxFilesAlert.fileCount)}
        </DialogDescription>
      </DialogHeader>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onMaxFilesCancel}>
          다시 선택
        </Button>
        <Button onClick={onMaxFilesConfirm}>처음 10개만 업로드</Button>
      </DialogFooter>
    </>
  );
}