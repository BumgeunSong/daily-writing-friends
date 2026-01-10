import { Loader2 } from 'lucide-react';
import { Draft } from '@/draft/model/Draft';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

interface DeleteDraftDialogProps {
  isOpen: boolean;
  draft: Draft | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteDraftDialog({
  isOpen,
  draft,
  isDeleting,
  onClose,
  onConfirm
}: DeleteDraftDialogProps) {
  // 임시 저장 글 제목 가져오기
  const getDraftTitle = () => {
    if (!draft) return '';
    return draft.title.trim() ? `"${draft.title}"` : '(제목 없음)';
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>임시 저장 글 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            {getDraftTitle()} 임시 저장 글을 삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                삭제 중...
              </>
            ) : (
              '삭제'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 