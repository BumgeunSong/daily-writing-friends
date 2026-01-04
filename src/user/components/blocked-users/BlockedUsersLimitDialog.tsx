import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/shared/ui/alert-dialog';

interface BlockedUsersLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BlockedUsersLimitDialog({ isOpen, onClose }: BlockedUsersLimitDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>비공개 사용자 한도 초과</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="py-4">
          <p>비공개 사용자는 최대 10명까지만 설정할 수 있습니다.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            새로운 사용자를 추가하려면 기존 사용자의 설정을 먼저 해제해주세요.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>확인</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
