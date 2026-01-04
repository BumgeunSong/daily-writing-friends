import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/shared/ui/alert-dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import type { BlockedUser } from '@/user/hooks/useBlockedUsers';

interface BlockedUserItemProps {
  user: BlockedUser;
  isConfirmOpen: boolean;
  onConfirmOpen: () => void;
  onConfirmClose: () => void;
  onUnblock: () => void;
  isLoading: boolean;
}

export function BlockedUserItem({
  user,
  isConfirmOpen,
  onConfirmOpen,
  onConfirmClose,
  onUnblock,
  isLoading,
}: BlockedUserItemProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="size-10 shrink-0">
        <AvatarImage src={user.profilePhotoURL || '/placeholder.svg'} />
        <AvatarFallback>{user.nickname?.[0] ?? ''}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{user.nickname}</div>
        <div className="truncate text-sm text-muted-foreground">{user.email}</div>
      </div>
      <AlertDialog open={isConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={onConfirmOpen} disabled={isLoading}>
            해제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.nickname}님의 비공개 설정을 해제하시겠습니까?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onConfirmClose}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={onUnblock}
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
