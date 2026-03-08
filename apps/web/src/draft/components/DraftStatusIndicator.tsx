import { Loader2 } from 'lucide-react';
import { getRelativeTime } from '@/shared/utils/dateUtils';

interface DraftStatusIndicatorProps {
  isSaving: boolean;
  savingError: Error | null;
  lastSavedAt: Date | null;
}

export function DraftStatusIndicator({
  isSaving,
  savingError,
  lastSavedAt,
}: DraftStatusIndicatorProps) {
  // 상태 메시지 생성
  const getStatusMessage = () => {
    if (isSaving) return "임시 저장 중...";
    if (savingError) return "임시 저장 중 오류가 발생했습니다.";
    if (lastSavedAt) {
      const relativeTime = getRelativeTime(lastSavedAt);
      return `마지막 저장: ${relativeTime}`;
    }
    return null; // 저장된 임시 저장 글이 없을 때는 메시지를 표시하지 않음
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="mt-2 flex items-center justify-between text-xs md:text-sm">
      {statusMessage && (
        <div className={`${savingError ? 'text-destructive' : 'text-muted-foreground'} flex items-center transition-colors duration-200`}>
          {isSaving && (
            <Loader2 
              className="mr-1 size-3 animate-spin" 
              aria-label="저장 중"
            />
          )}
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
} 