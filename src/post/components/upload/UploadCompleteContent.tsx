import { Button } from '@/shared/ui/button';
import { DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import type { UploadResult } from '../../types/upload';

interface UploadCompleteContentProps {
  uploadComplete: UploadResult;
  onClose: () => void;
}

export function UploadCompleteContent({ uploadComplete, onClose }: UploadCompleteContentProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>업로드 완료</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <p className="text-center">
          {uploadComplete.success}개 업로드 완료
          {uploadComplete.failed > 0 && (
            <span className="text-destructive">, {uploadComplete.failed}개 실패</span>
          )}
        </p>

        {uploadComplete.failedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">실패한 파일:</p>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {uploadComplete.failedFiles.map((file, index) => (
                <p key={index} className="text-xs text-muted-foreground">
                  • {file.name}: {file.error}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={onClose}>닫기</Button>
      </DialogFooter>
    </>
  );
}