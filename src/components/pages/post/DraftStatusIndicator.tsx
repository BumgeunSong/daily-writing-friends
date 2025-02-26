import { Loader2 } from 'lucide-react';

interface DraftStatusIndicatorProps {
  isSaving: boolean;
  savingError: Error | null;
  lastSavedAt: Date | null;
  onManualSave: () => Promise<void>;
  isSubmitting: boolean;
}

export function DraftStatusIndicator({
  isSaving,
  savingError,
  lastSavedAt
}: DraftStatusIndicatorProps) {
  // 마지막 저장 시간 포맷팅
  const formattedLastSavedAt = lastSavedAt 
    ? new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(lastSavedAt)
    : null;

  // 상태 메시지 생성
  const getStatusMessage = () => {
    if (isSaving) return "초안을 저장하는 중...";
    if (savingError) return "초안 저장 중 오류가 발생했습니다.";
    if (formattedLastSavedAt) return `마지막 저장: ${formattedLastSavedAt}`;
    return null; // 저장된 초안이 없을 때는 메시지를 표시하지 않음
  };

  const statusMessage = getStatusMessage();

  return statusMessage ? (
    <div className="flex items-center justify-between mt-2 text-sm">
      <div className={`${savingError ? 'text-red-500' : 'text-gray-500'} flex items-center`}>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
        {statusMessage}
      </div>
    </div>
  ) : null;
} 