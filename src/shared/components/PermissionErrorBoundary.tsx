import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/shared/ui/alert-dialog';

export function PermissionErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(true);

  // Check if it's a 403 permission error
  if (isRouteErrorResponse(error) && error.status === 403) {
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
            <AlertDialogAction onClick={() => {
              setOpen(false);
              localStorage.removeItem('boardId');
              navigate('/boards', { replace: true });
            }}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // For other errors, show a generic error message
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h2 className="mb-2 text-xl font-semibold">문제가 발생했습니다</h2>
      <p className="mb-4 text-gray-600">
        {isRouteErrorResponse(error) 
          ? `오류 ${error.status}: ${error.data || error.statusText}`
          : '알 수 없는 오류가 발생했습니다.'
        }
      </p>
      <button 
        onClick={() => navigate(-1)}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        돌아가기
      </button>
    </div>
  );
}