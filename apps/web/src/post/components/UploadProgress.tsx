import { Progress } from '@/shared/ui/progress';

type UploadStage = 'idle' | 'converting' | 'resizing' | 'uploading';

interface UploadProgressProps {
  stage: UploadStage;
  uploadProgress: number;
}

const STAGE_LABELS: Record<Exclude<UploadStage, 'idle'>, string> = {
  converting: '이미지 변환 중...',
  resizing: '이미지 압축 중...',
  uploading: '이미지 업로드 중...',
};

/**
 * Upload progress overlay component.
 * Shows distinct copy + indicator per stage so users know what is happening.
 */
export function UploadProgress({ stage, uploadProgress }: UploadProgressProps) {
  if (stage === 'idle') return null;

  const label = STAGE_LABELS[stage];
  const showRealProgress = stage === 'uploading';
  const roundedPercent = Math.round(uploadProgress);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
      <div className="w-4/5 max-w-md space-y-3 p-4">
        {showRealProgress ? (
          <Progress value={uploadProgress} className="h-2" />
        ) : (
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-full animate-pulse bg-primary" />
          </div>
        )}
        <p className="text-center text-sm font-medium text-foreground">
          {label}
          {showRealProgress ? ` ${roundedPercent}%` : ''}
        </p>
      </div>
    </div>
  );
}
