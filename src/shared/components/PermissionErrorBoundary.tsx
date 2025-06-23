import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
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
            <AlertDialogAction onClick={() => { setOpen(false); window.history.back(); }}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // For other errors, show a generic error message
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-xl font-semibold mb-2">문제가 발생했습니다</h2>
      <p className="text-gray-600 mb-4">
        {isRouteErrorResponse(error) 
          ? `오류 ${error.status}: ${error.data || error.statusText}`
          : '알 수 없는 오류가 발생했습니다.'
        }
      </p>
      <button 
        onClick={() => window.history.back()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        돌아가기
      </button>
    </div>
  );
}