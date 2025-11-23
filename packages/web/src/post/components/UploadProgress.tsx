import { Progress } from '@/shared/ui/progress';

interface UploadProgressProps {
  isUploading: boolean;
  uploadProgress: number;
}

/**
 * Upload progress overlay component
 * Shows a progress bar when files are being uploaded
 */
export function UploadProgress({ isUploading, uploadProgress }: UploadProgressProps) {
  if (!isUploading) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
      <div className="w-4/5 max-w-md space-y-3 p-4">
        <Progress value={uploadProgress} className="h-2" />
        <p className="text-center text-sm font-medium text-foreground">
          이미지 업로드 중... {uploadProgress}%
        </p>
      </div>
    </div>
  );
}