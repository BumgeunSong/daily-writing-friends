import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import ComposedAvatar from '@/shared/ui/ComposedAvatar';
import type { User } from '@/user/model/User';

interface BlockedUserRowProps {
  user: User;
  loading: boolean;
  isConfirming: boolean;
  onRequestUnblock: () => void;
  onCancelUnblock: () => void;
  onConfirmUnblock: () => void;
}

export default function BlockedUserRow({
  user,
  loading,
  isConfirming,
  onRequestUnblock,
  onCancelUnblock,
  onConfirmUnblock,
}: BlockedUserRowProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <ComposedAvatar
        className="shrink-0"
        size={40}
        src={user.profilePhotoURL || undefined}
        alt={user.nickname || 'User'}
        fallback={user.nickname?.[0] || ''}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{user.nickname}</div>
        <div className="truncate text-sm text-muted-foreground">{user.email}</div>
      </div>
      <AlertDialog open={isConfirming}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={onRequestUnblock} disabled={loading}>
            해제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{user.nickname}님의 비공개 설정을 해제하시겠습니까?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelUnblock}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmUnblock}
              className="bg-destructive hover:bg-destructive/90"
            >
              해제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
