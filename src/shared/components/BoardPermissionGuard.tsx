import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUser } from '@/user/hooks/useUser';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/shared/ui/alert-dialog';

interface BoardPermissionGuardProps {
  boardId: string;
  children: React.ReactNode;
}

export function BoardPermissionGuard({ boardId, children }: BoardPermissionGuardProps) {
  const { currentUser } = useAuth();
  const { userData, isLoading } = useUser(currentUser?.uid ?? null);
  const [open, setOpen] = useState(false);

  React.useEffect(() => {
    if (!isLoading && userData && boardId) {
      const perm = userData.boardPermissions?.[boardId];
      if (perm !== 'read' && perm !== 'write') {
        setOpen(true);
      } else {
        setOpen(false);
      }
    }
  }, [isLoading, userData, boardId]);

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const hasPermission = userData?.boardPermissions?.[boardId] === 'read' || userData?.boardPermissions?.[boardId] === 'write';
  
  // 권한 없음: AlertDialog만 노출, children 미노출
  if (!hasPermission) {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>읽기 권한 없음</AlertDialogTitle>
            <AlertDialogDescription>
              이 기수에 참여하지 않아서 글을 읽을 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setOpen(false); window.history.back(); }}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // 권한 있음: children 렌더
  return <>{children}</>;
} 